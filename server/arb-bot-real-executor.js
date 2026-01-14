/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT EJECUTOR REAL - MUESTRA PROFIT REAL DE BLOCKCHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ejecuta trades REALES
 * 2. Calcula profit REAL basado en balance antes/después
 * 3. Muestra transacciones verificables en blockchain
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
  SCAN_INTERVAL_MS: 3000,        // Escanear cada 3 segundos
  MIN_PROFIT_BPS: -100,          // -1% (acepta pequeñas pérdidas para pruebas)
  MAX_SLIPPAGE_BPS: 50,          // 0.5% slippage
  TRADE_AMOUNT_ETH: 0.005,       // 0.005 ETH por trade
  FEE_TIERS: [500, 3000],        // 0.05% y 0.3%
  GAS_LIMIT_WRAP: 60000,
  GAS_LIMIT_APPROVE: 60000,
  GAS_LIMIT_SWAP: 300000
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIGURACIÓN
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
  'function decimals() view returns (uint8)',
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
  initialBalances: {},
  currentBalances: {},
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    realProfitUsd: 0,  // Profit REAL calculado de balances
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'liquidation', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋',
    'SCAN': '🔍',
    'EXEC': '🔥',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'PROFIT': '💰'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones a chains...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Test connection
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        usdc: new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[chainKey])
      };
      
      // Obtener balances
      const ethBalance = await provider.getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      // Obtener precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      const totalUsd = (ethBalanceNum + wethBalanceNum) * ethPrice + usdcBalanceNum;
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: ethBalanceNum.toFixed(6),
        wethBalance: wethBalanceNum.toFixed(6),
        usdcBalance: usdcBalanceNum.toFixed(2),
        balanceUsd: totalUsd,
        ethPrice,
        isActive: ethBalanceNum > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: ['Uniswap V3']
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
      
      log(`${chain.name}: ${ethBalanceNum.toFixed(6)} ETH + ${wethBalanceNum.toFixed(6)} WETH + ${usdcBalanceNum.toFixed(2)} USDC = $${totalUsd.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message}`, 'ERROR');
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

async function updateBalances() {
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    try {
      const ethBalance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const wethBalance = await contracts[chainKey].weth.balanceOf(WALLET_ADDRESS);
      const usdcBalance = await contracts[chainKey].usdc.balanceOf(WALLET_ADDRESS);
      
      const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
      const wethBalanceNum = parseFloat(ethers.formatEther(wethBalance));
      const usdcBalanceNum = parseFloat(ethers.formatUnits(usdcBalance, 6));
      
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (chainState) {
        const totalUsd = (ethBalanceNum + wethBalanceNum) * chainState.ethPrice + usdcBalanceNum;
        chainState.balance = ethBalanceNum.toFixed(6);
        chainState.wethBalance = wethBalanceNum.toFixed(6);
        chainState.usdcBalance = usdcBalanceNum.toFixed(2);
        chainState.balanceUsd = totalUsd;
      }
      
      state.currentBalances[chainKey] = {
        eth: ethBalanceNum,
        weth: wethBalanceNum,
        usdc: usdcBalanceNum
      };
    } catch (e) {}
  }
  
  // Calcular profit REAL
  if (state.initialBalances && Object.keys(state.initialBalances).length > 0) {
    let totalInitialUsd = 0;
    let totalCurrentUsd = 0;
    
    for (const chainKey of Object.keys(state.initialBalances)) {
      const chainState = state.chains.find(c => c.chain === chainKey);
      if (!chainState) continue;
      
      const initial = state.initialBalances[chainKey];
      const current = state.currentBalances[chainKey];
      
      if (initial && current) {
        totalInitialUsd += (initial.eth + initial.weth) * chainState.ethPrice + initial.usdc;
        totalCurrentUsd += (current.eth + current.weth) * chainState.ethPrice + current.usdc;
      }
    }
    
    state.stats.realProfitUsd = totalCurrentUsd - totalInitialUsd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = BigInt(CONFIG.GAS_LIMIT_WRAP + CONFIG.GAS_LIMIT_APPROVE * 2 + CONFIG.GAS_LIMIT_SWAP * 2);
    const gasCostWei = gasPrice * estimatedGas;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    const amountWei = ethers.parseEther(CONFIG.TRADE_AMOUNT_ETH.toString());
    
    // Probar todas las combinaciones de fee tiers
    for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
      for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
        if (i === j) continue;
        
        try {
          // Quote 1: WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: CONFIG.FEE_TIERS[i],
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // Quote 2: USDC → WETH
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: usdcOut,
            fee: CONFIG.FEE_TIERS[j],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote2[0];
          
          // Calcular profit
          const grossProfitWei = wethOut - amountWei;
          const grossProfitEth = parseFloat(ethers.formatEther(grossProfitWei));
          const grossProfitUsd = grossProfitEth * ethPrice;
          const netProfitUsd = grossProfitUsd - gasCostUsd;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'SIMPLE_ARB',
            route: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
            amountInEth: CONFIG.TRADE_AMOUNT_ETH,
            amountIn: amountWei,
            fee1: CONFIG.FEE_TIERS[i],
            fee2: CONFIG.FEE_TIERS[j],
            usdcIntermediate: usdcOut,
            wethOut: wethOut,
            spreadBps,
            grossProfitUsd,
            gasCostUsd,
            netProfitUsd,
            ethPrice,
            profitable: spreadBps >= CONFIG.MIN_PROFIT_BPS,
            timestamp: Date.now()
          });
          
        } catch (e) {
          // Pool no existe o error de cotización
        }
      }
    }
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    log('Ya hay una ejecución en progreso', 'WARN');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth, usdc } = contracts[opp.chain];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE REAL en ${chain.name}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Amount: ${opp.amountInEth} ETH`, 'EXEC');
  log(`Expected: ${opp.spreadBps} bps ($${opp.netProfitUsd.toFixed(4)})`, 'EXEC');
  
  // Balance ANTES
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const usdcBefore = await usdc.balanceOf(WALLET_ADDRESS);
  
  const totalEthBefore = ethBefore + wethBefore;
  log(`Balance ANTES: ${ethers.formatEther(totalEthBefore)} ETH total`, 'INFO');
  
  try {
    // 1. Wrap ETH → WETH
    log('Paso 1/4: Wrapping ETH → WETH...', 'INFO');
    const wrapTx = await weth.deposit({
      value: opp.amountIn,
      gasLimit: CONFIG.GAS_LIMIT_WRAP
    });
    await wrapTx.wait(1);
    log(`Wrap completado: ${wrapTx.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // 2. Approve WETH si es necesario
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      log('Paso 2/4: Approving WETH...', 'INFO');
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveTx.wait(1);
      log('WETH approved', 'SUCCESS');
    } else {
      log('Paso 2/4: WETH ya aprobado', 'SUCCESS');
    }
    
    // 3. Swap WETH → USDC
    log(`Paso 3/4: Swap WETH → USDC (fee: ${opp.fee1/100}%)...`, 'INFO');
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt1 = await swap1Tx.wait(1);
    log(`Swap 1 completado: ${receipt1.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Obtener USDC recibido
    const usdcReceived = await usdc.balanceOf(WALLET_ADDRESS);
    log(`USDC recibido: ${ethers.formatUnits(usdcReceived, 6)}`, 'INFO');
    
    // 4. Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcReceived) {
      log('Approving USDC...', 'INFO');
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, {
        gasLimit: CONFIG.GAS_LIMIT_APPROVE
      });
      await approveUsdcTx.wait(1);
    }
    
    // 5. Swap USDC → WETH
    log(`Paso 4/4: Swap USDC → WETH (fee: ${opp.fee2/100}%)...`, 'INFO');
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcReceived,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: CONFIG.GAS_LIMIT_SWAP });
    
    const receipt2 = await swap2Tx.wait(1);
    log(`Swap 2 completado: ${receipt2.hash.slice(0, 20)}...`, 'SUCCESS');
    
    // Balance DESPUÉS
    const ethAfter = await provider.getBalance(WALLET_ADDRESS);
    const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
    const usdcAfter = await usdc.balanceOf(WALLET_ADDRESS);
    
    const totalEthAfter = ethAfter + wethAfter;
    
    // Calcular PROFIT REAL
    const profitWei = totalEthAfter - totalEthBefore;
    const profitEth = parseFloat(ethers.formatEther(profitWei));
    const profitUsd = profitEth * opp.ethPrice;
    
    // Gas usado
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const executionTime = Date.now() - startTime;
    
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    log(`TRADE COMPLETADO!`, 'SUCCESS');
    log(`Balance DESPUÉS: ${ethers.formatEther(totalEthAfter)} ETH total`, 'INFO');
    log(`PROFIT REAL: ${profitEth.toFixed(8)} ETH ($${profitUsd.toFixed(4)})`, 'PROFIT');
    log(`Gas pagado: $${totalGasUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt2.hash}`, 'INFO');
    log(`═══════════════════════════════════════════════════════════`, 'PROFIT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitEth,
      profitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd: profitUsd, // Ya incluye gas porque es diferencia de balances
      txHash: receipt2.hash,
      executionTimeMs: executionTime,
      balanceBefore: ethers.formatEther(totalEthBefore),
      balanceAfter: ethers.formatEther(totalEthAfter)
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return {
      success: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  if (activeChains.length === 0) return;
  
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    state.stats.opportunitiesFound += opportunities.length;
    state.strategies[0].opportunities += opportunities.length;
    
    const best = opportunities[0];
    
    if (state.stats.totalScans % 5 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Best: ${best.spreadBps} bps ($${best.netProfitUsd.toFixed(4)})`, 'SCAN');
    }
    
    // Ejecutar si cumple umbral y NO es dry run
    if (best.profitable && !state.isDryRun) {
      log(`Oportunidad encontrada! ${best.spreadBps} bps >= ${CONFIG.MIN_PROFIT_BPS} bps`, 'EXEC');
      
      state.stats.tradesAttempted++;
      state.strategies[0].executions++;
      
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
          executionTimeMs: result.executionTimeMs || 0,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.totalGasUsd += result.gasUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
          
          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.wins++;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        } else {
          state.stats.tradesFailed++;
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.attempts++;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta)) * 100;
          }
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  }
  
  // Actualizar balances cada 10 scans
  if (state.stats.totalScans % 10 === 0) {
    await updateBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
  
  // Guardar balances iniciales
  await updateBalances();
  state.initialBalances = JSON.parse(JSON.stringify(state.currentBalances));
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, tradesFailed: 0, totalProfitUsd: 0, totalGasUsd: 0,
    netProfitUsd: 0, realProfitUsd: 0, winRate: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING'
  };
  state.tradeLogs = [];
  
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN (simulación)' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`, 'EXEC');
  log(`Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps`, 'INFO');
  log(`Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH`, 'INFO');
  log(`═══════════════════════════════════════════════════════════`, 'EXEC');
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primera vez inmediatamente
  setTimeout(tick, 1000);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    initialBalances: state.initialBalances
  });
});

app.post('/api/defi/multichain-arb/stop', async (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  
  await updateBalances();
  
  log(`Bot detenido`, 'INFO');
  log(`Profit REAL total: $${state.stats.realProfitUsd.toFixed(4)}`, 'PROFIT');
  
  res.json({
    success: true,
    isRunning: false,
    finalStats: state.stats,
    realProfitUsd: state.stats.realProfitUsd
  });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) {
    strategy.enabled = action === 'enable';
    log(`Estrategia ${name} ${action === 'enable' ? 'activada' : 'desactivada'}`, 'INFO');
  }
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🔥 BOT EJECUTOR REAL - PROFIT VERIFICABLE EN BLOCKCHAIN
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: ${CONFIG.MIN_PROFIT_BPS} bps
   ⚡ Trade Amount: ${CONFIG.TRADE_AMOUNT_ETH} ETH
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot calcula el profit REAL basado en diferencia de balances
   📋 No hay cálculos ficticios - todo verificable en blockchain

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});





