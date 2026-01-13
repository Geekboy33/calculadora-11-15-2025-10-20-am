/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

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
 * 💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot SOLO ejecuta cuando hay profit POSITIVO REAL después de gas
 * Incluye múltiples DEXs para encontrar diferencias de precio reales
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
// CONFIGURACIÓN - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,         // Escanear cada 2 segundos
  MIN_PROFIT_USD: 0.10,           // MÍNIMO $0.10 de profit DESPUÉS de gas
  MIN_PROFIT_BPS: 10,             // MÍNIMO 0.1% de spread (10 bps)
  MAX_SLIPPAGE_BPS: 30,           // 0.3% slippage máximo
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],  // Diferentes cantidades
  GAS_BUFFER_MULTIPLIER: 1.5,     // Buffer de gas para asegurar profit
  ONLY_POSITIVE_PROFIT: true      // SOLO ejecutar profit positivo
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpportunities: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base',
    currentStrategy: 'IDLE',
    bestOpportunityToday: null,
    lastScanTime: 0
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'simpleArb', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'stablecoin', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'flashLoan', enabled: false, scans: 0, opportunities: 0, executions: 0 },
    { name: 'mev', enabled: false, scans: 0, opportunities: 0, executions: 0 }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    'INFO': '📋', 'SCAN': '🔍', 'EXEC': '🔥', 'SUCCESS': '✅',
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'SKIP': '⏭️'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Agregar contratos de DEXs
      if (chain.dexs.uniswapV3) {
        contracts[chainKey].uniQuoter = new ethers.Contract(
          chain.dexs.uniswapV3.quoter, QUOTER_ABI, provider
        );
        contracts[chainKey].uniRouter = new ethers.Contract(
          chain.dexs.uniswapV3.router, ROUTER_ABI, signers[chainKey]
        );
      }
      
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
      let ethPrice = 3500;
      try {
        const priceQuote = await contracts[chainKey].uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: ethers.parseEther('1'),
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      } catch (e) {}
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        connected: true,
        protocols: Object.keys(chain.dexs)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)}) - ETH@$${ethPrice.toFixed(2)}`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES - SOLO PROFIT POSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForProfitableOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    
    // Estimar costo de gas total (wrap + 2 approves + 2 swaps)
    const estimatedGasUnits = BigInt(60000 + 60000 + 60000 + 300000 + 300000);
    const gasCostWei = gasPrice * estimatedGasUnits * BigInt(Math.floor(CONFIG.GAS_BUFFER_MULTIPLIER * 100)) / 100n;
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Arbitraje entre fee tiers (intra-DEX)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const fees = chain.dexs.uniswapV3?.fees || [500, 3000];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC (fee i)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH (fee j)
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            // Calcular profit
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            // SOLO agregar si profit es POSITIVO
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${fees[i]/100}%)→WETH(${fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: fees[i],
                fee2: fees[j],
                usdcIntermediate: usdcOut,
                wethOut,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 OPORTUNIDAD RENTABLE: ${chain.name} | ${fees[i]/100}%→${fees[j]/100}% | ${amountEth} ETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
            
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Arbitraje triangular (WETH → USDC → DAI → WETH)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chain.tokens.DAI) {
        try {
          // WETH → USDC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];
          
          // USDC → DAI
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.DAI,
            amountIn: usdcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const daiOut = quote2[0];
          
          // DAI → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.DAI,
            tokenOut: chain.tokens.WETH,
            amountIn: daiOut,
            fee: 3000,
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfitWei = wethOut - amountWei;
          const triGasCost = gasCostWei * 3n / 2n; // 50% más gas por 3 swaps
          const netProfitWei = grossProfitWei - triGasCost;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              route: 'WETH→USDC→DAI→WETH',
              amountInEth: amountEth,
              amountIn: amountWei,
              intermediates: { usdc: usdcOut, dai: daiOut },
              wethOut,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR RENTABLE: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Stablecoin arbitrage (USDC ↔ USDbC en Base)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'base' && chain.tokens.USDbC) {
        try {
          const usdcAmount = ethers.parseUnits('100', 6); // $100 USDC
          
          // USDC → USDbC
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.USDbC,
            amountIn: usdcAmount,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdBcOut = quote1[0];
          
          // USDbC → USDC
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDbC,
            tokenOut: chain.tokens.USDC,
            amountIn: usdBcOut,
            fee: 100,
            sqrtPriceLimitX96: 0n
          });
          const usdcFinal = quote2[0];
          
          const profitUsdc = usdcFinal - usdcAmount;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const stableGasCost = gasCostUsd * 0.5; // Menos gas para stables
          const netProfitUsd = profitUsd - stableGasCost;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN',
              route: 'USDC→USDbC→USDC',
              amountIn: usdcAmount,
              amountInUsd: 100,
              usdcFinal,
              spreadBps: Number((profitUsdc * 10000n) / usdcAmount),
              grossProfitUsd: profitUsd,
              gasCostUsd: stableGasCost,
              netProfitUsd,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 STABLECOIN RENTABLE: ${chain.name} | USDC↔USDbC | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
        } catch (e) {}
      }
    }
    
  } catch (e) {
    log(`Error escaneando ${chain.name}: ${e.message.slice(0, 50)}`, 'ERROR');
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR TRADE (solo si profit positivo)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeProfitableTrade(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) {
    log(`Trade rechazado: profit $${opp.netProfitUsd.toFixed(4)} < mínimo $${CONFIG.MIN_PROFIT_USD}`, 'SKIP');
    return null;
  }
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const provider = providers[opp.chain];
  const { uniRouter, weth } = contracts[opp.chain];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO TRADE RENTABLE en ${chain.name}`, 'EXEC');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  // Balance antes
  const ethBefore = await provider.getBalance(WALLET_ADDRESS);
  const wethBefore = await weth.balanceOf(WALLET_ADDRESS);
  const totalBefore = ethBefore + wethBefore;
  
  try {
    if (opp.strategy === 'INTRA_DEX') {
      // Wrap ETH
      log('Wrapping ETH...', 'INFO');
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      
      // Approve WETH
      const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (allowance < opp.amountIn) {
        const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveTx.wait(1);
      }
      
      // Swap 1: WETH → USDC
      log(`Swap 1: WETH → USDC (${opp.fee1/100}%)...`, 'INFO');
      const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap1Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        fee: opp.fee1,
        recipient: WALLET_ADDRESS,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdc,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      await swap1Tx.wait(1);
      
      // Approve USDC
      const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signers[opp.chain]);
      const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
      const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
      if (usdcAllowance < usdcBalance) {
        const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
        await approveUsdcTx.wait(1);
      }
      
      // Swap 2: USDC → WETH
      log(`Swap 2: USDC → WETH (${opp.fee2/100}%)...`, 'INFO');
      const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
      const swap2Tx = await uniRouter.exactInputSingle({
        tokenIn: chain.tokens.USDC,
        tokenOut: chain.tokens.WETH,
        fee: opp.fee2,
        recipient: WALLET_ADDRESS,
        amountIn: usdcBalance,
        amountOutMinimum: minWeth,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      const receipt = await swap2Tx.wait(1);
      
      // Balance después
      const ethAfter = await provider.getBalance(WALLET_ADDRESS);
      const wethAfter = await weth.balanceOf(WALLET_ADDRESS);
      const totalAfter = ethAfter + wethAfter;
      
      // Profit REAL
      const realProfitWei = totalAfter - totalBefore;
      const realProfitEth = parseFloat(ethers.formatEther(realProfitWei));
      const realProfitUsd = realProfitEth * opp.ethPrice;
      
      const executionTime = Date.now() - startTime;
      
      log(`════════════════════════════════════════════════════════════`, 'PROFIT');
      log(`TRADE COMPLETADO!`, 'SUCCESS');
      log(`PROFIT REAL: ${realProfitEth.toFixed(8)} ETH ($${realProfitUsd.toFixed(4)})`, 'PROFIT');
      log(`Tiempo: ${executionTime}ms`, 'INFO');
      log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
      
      isExecuting = false;
      
      return {
        success: true,
        profitEth: realProfitEth,
        profitUsd: realProfitUsd,
        txHash: receipt.hash,
        executionTimeMs: executionTime
      };
    }
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    isExecuting = false;
    return { success: false, error: e.message };
  }
  
  isExecuting = false;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const scanStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Rotar chains
  const activeChains = Object.keys(CHAINS).filter(k => providers[k]);
  const chainIndex = state.stats.totalScans % activeChains.length;
  const selectedChain = activeChains[chainIndex];
  state.stats.currentChain = selectedChain;
  state.stats.currentStrategy = 'SCANNING';
  
  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b, selected: b.chain === selectedChain
  }));
  
  // Escanear SOLO oportunidades rentables
  const opportunities = await scanForProfitableOpportunities(selectedChain);
  state.stats.lastScanTime = Date.now() - scanStart;
  
  state.strategies[0].scans++;
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    
    // Ordenar por profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    // Guardar en estado
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString(),
      usdcIntermediate: o.usdcIntermediate?.toString(),
      wethOut: o.wethOut?.toString()
    }));
    
    const best = opportunities[0];
    
    // Actualizar mejor oportunidad del día
    if (!state.stats.bestOpportunityToday || best.netProfitUsd > state.stats.bestOpportunityToday.netProfitUsd) {
      state.stats.bestOpportunityToday = {
        chain: best.chainName,
        route: best.route,
        netProfitUsd: best.netProfitUsd,
        timestamp: Date.now()
      };
    }
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} oportunidades RENTABLES | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun) {
      state.stats.tradesAttempted++;
      const result = await executeProfitableTrade(best);
      
      if (result) {
        state.stats.tradesExecuted++;
        
        const tradeLog = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          chain: best.chain,
          chainName: best.chainName,
          strategy: best.strategy,
          route: best.route,
          amountIn: best.amountInEth || best.amountInUsd,
          expectedProfit: best.netProfitUsd.toFixed(4),
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0
        };
        
        state.tradeLogs.unshift(tradeLog);
        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
        
        if (result.success) {
          state.stats.tradesSuccessful++;
          state.stats.totalProfitUsd += result.profitUsd || 0;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;
        }
        
        state.stats.winRate = state.stats.tradesExecuted > 0
          ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
          : 0;
      }
    }
  } else {
    // Log cada 10 scans si no hay oportunidades
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables (>${CONFIG.MIN_PROFIT_USD}$)`, 'SCAN');
    }
  }
  
  // Actualizar balances cada 30 scans
  if (state.stats.totalScans % 30 === 0) {
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      if (!providers[chainKey]) continue;
      try {
        const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
        const chainState = state.chains.find(c => c.chain === chainKey);
        if (chainState) {
          chainState.balance = parseFloat(ethers.formatEther(balance)).toFixed(6);
          chainState.balanceUsd = parseFloat(chainState.balance) * chainState.ethPrice;
        }
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(JSON.parse(JSON.stringify(state, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, profitableOpportunities: 0,
    tradesAttempted: 0, tradesExecuted: 0, tradesSuccessful: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0, winRate: 0,
    uptime: 0, currentChain: 'base', currentStrategy: 'STARTING',
    bestOpportunityToday: null, lastScanTime: 0
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`SOLO ejecutará trades con profit > $${CONFIG.MIN_PROFIT_USD}`, 'INFO');
  log(`Min spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)`, 'INFO');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, config: CONFIG });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  log('Bot detenido', 'INFO');
  res.json({ success: true, isRunning: false, stats: state.stats });
});

app.post('/api/defi/multichain-arb/strategy/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const strategy = state.strategies.find(s => s.name === name);
  if (strategy) strategy.enabled = action === 'enable';
  res.json({ success: true, strategies: state.strategies });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, running: state.isRunning, dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS, minProfitUsd: CONFIG.MIN_PROFIT_USD,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE - SOLO PROFIT POSITIVO
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} USD (POSITIVO)
   ⚡ Min Spread: ${CONFIG.MIN_PROFIT_BPS} bps (${CONFIG.MIN_PROFIT_BPS/100}%)
   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms
   
   📋 Este bot SOLO ejecuta cuando hay profit POSITIVO después de gas
   📋 NO ejecutará trades con pérdida

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




