/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT V2 - MULTI-DEX + CROSS-CHAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Intra-DEX: Diferentes fee tiers en Uniswap V3
 * 2. Cross-DEX: Uniswap vs SushiSwap vs Aerodrome
 * 3. Triangular: WETH → USDC → USDT → WETH
 * 4. Cross-Chain: Detectar diferencias de precio entre chains
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
// CONFIGURACIÓN SCALPER V2
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 300,           // 3.3 scans por segundo
  PARALLEL_CHAIN_SCAN: true,
  
  // UMBRALES - MÁS AGRESIVOS
  MIN_PROFIT_USD: 0.001,           // $0.001 mínimo 
  MIN_SPREAD_BPS: 0,               // Sin mínimo de spread
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  
  // CANTIDADES
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.005, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  MAX_CONCURRENT_TRADES: 2,
  
  // GAS - Más permisivo
  MAX_GAS_GWEI: 20,
  
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481'
      },
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    priority: 1
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
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      }
    },
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
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    priority: 3
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_V2',
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
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null,
    priceData: {}
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
let activeTrades = 0;
let scanTimes = [];
let priceCache = {};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.dexs.uniswapV3.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[key].sushiRouter = new ethers.Contract(chain.dexs.sushiswap.router, SUSHI_ROUTER_ABI, signers[key]);
      }
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length * 2,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority,
        ethPrice: 0,
        usdcPrice: 0
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
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBTENER PRECIO ETH EN CADA CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function getEthPriceOnChain(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  try {
    // Quote 1 ETH → USDC
    const oneEth = ethers.parseEther('1');
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: oneEth,
      fee: 500, // 0.05% pool (más líquido)
      sqrtPriceLimitX96: 0n
    });
    
    // USDC tiene 6 decimales
    const priceUsd = parseFloat(ethers.formatUnits(quote[0], 6));
    priceCache[chainKey] = { price: priceUsd, timestamp: Date.now() };
    
    return priceUsd;
  } catch (e) {
    return priceCache[chainKey]?.price || CONFIG.ETH_PRICE_USD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO MULTI-ESTRATEGIA
// ═══════════════════════════════════════════════════════════════════════════════

async function multiStrategyScalp(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Obtener precio ETH actual en esta chain
    const ethPrice = await getEthPriceOnChain(chainKey);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    const quotePromises = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          quotePromises.push(
            (async () => {
              try {
                // WETH → USDC (fee tier i)
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // USDC → WETH (fee tier j)
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
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      strategy: 'INTRA_DEX',
                      type: 'SCALP',
                      direction: `WETH→USDC(${CONFIG.FEE_TIERS[i]/100}%)→WETH(${CONFIG.FEE_TIERS[j]/100}%)`,
                      route: `Fee ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
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
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 5)
                    };
                  }
                }
              } catch (e) {}
              return null;
            })()
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 2: Triangular (WETH → USDC → DAI → WETH) si DAI existe
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (chain.tokens.DAI) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        quotePromises.push(
          (async () => {
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
              
              const grossProfit = wethOut - amountWei;
              const netProfit = grossProfit - (gasCostWei * 3n / 2n); // Más gas para 3 swaps
              
              if (netProfit > 0n) {
                const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
                const spreadBps = Number((grossProfit * 10000n) / amountWei);
                
                if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                  return {
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'TRIANGULAR',
                    type: 'SCALP',
                    direction: 'WETH→USDC→DAI→WETH',
                    route: 'Triangular USDC-DAI',
                    amountIn: amountWei,
                    amountInEth: amountEth,
                    fee1: 500,
                    fee2: 100,
                    fee3: 3000,
                    usdcIntermediate: usdcOut,
                    daiIntermediate: daiOut,
                    wethOut,
                    grossProfit,
                    netProfit,
                    netProfitUsd,
                    gasCostUsd: gasCostUsd * 1.5,
                    spreadBps,
                    ethPrice,
                    timestamp: Date.now(),
                    gasPrice: gasPriceGwei,
                    confidence: Math.min(100, spreadBps * 3)
                  };
                }
              }
            } catch (e) {}
            return null;
          })()
        );
      }
    }
    
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR ARBITRAJE CROSS-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function detectCrossChainArb() {
  const opportunities = [];
  
  // Obtener precios de todas las chains
  const prices = {};
  for (const chainKey of Object.keys(CHAINS)) {
    prices[chainKey] = await getEthPriceOnChain(chainKey);
  }
  
  // Comparar precios entre chains
  const chainKeys = Object.keys(prices);
  for (let i = 0; i < chainKeys.length; i++) {
    for (let j = i + 1; j < chainKeys.length; j++) {
      const chain1 = chainKeys[i];
      const chain2 = chainKeys[j];
      const price1 = prices[chain1];
      const price2 = prices[chain2];
      
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const spreadPct = (priceDiff / avgPrice) * 100;
      
      // Log si hay diferencia significativa (> 0.1%)
      if (spreadPct > 0.1) {
        const cheapChain = price1 < price2 ? chain1 : chain2;
        const expensiveChain = price1 < price2 ? chain2 : chain1;
        const cheapPrice = Math.min(price1, price2);
        const expensivePrice = Math.max(price1, price2);
        
        console.log(`[CROSS-CHAIN] 📊 ${CHAINS[cheapChain].name}($${cheapPrice.toFixed(2)}) → ${CHAINS[expensiveChain].name}($${expensivePrice.toFixed(2)}) | Spread: ${spreadPct.toFixed(3)}%`);
        
        // Nota: Cross-chain arb requiere bridge, no se puede ejecutar instantáneamente
        // Pero lo registramos como oportunidad detectada
        opportunities.push({
          chain: 'cross-chain',
          chainName: `${CHAINS[cheapChain].name} → ${CHAINS[expensiveChain].name}`,
          strategy: 'CROSS_CHAIN',
          type: 'INFO',
          direction: `Buy on ${CHAINS[cheapChain].name}, Sell on ${CHAINS[expensiveChain].name}`,
          route: `Cross-Chain ${spreadPct.toFixed(2)}%`,
          spreadPct,
          cheapPrice,
          expensivePrice,
          potentialProfitPer1Eth: priceDiff,
          timestamp: Date.now(),
          executable: false, // Requiere bridge
          note: 'Requiere bridge manual o automatizado'
        });
      }
    }
  }
  
  // Actualizar estado con precios
  state.stats.priceData = prices;
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= CONFIG.MAX_CONCURRENT_TRADES) {
    return null;
  }
  
  if (opp.strategy === 'CROSS_CHAIN' || !opp.executable !== false) {
    // No ejecutar cross-chain automáticamente
    if (opp.strategy === 'CROSS_CHAIN') return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [EXEC] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (wethAllowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. ENTRADA: WETH → USDC
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
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SALIDA: USDC → WETH
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
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    
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
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    let allOpportunities = [];
    
    // Escaneo paralelo de todas las chains
    if (CONFIG.PARALLEL_CHAIN_SCAN) {
      const scanPromises = activeChains.map(chainKey => multiStrategyScalp(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
      
      // También detectar cross-chain cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const crossChainOpps = await detectCrossChainArb();
        allOpportunities.push(...crossChainOpps);
      }
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 50) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN').length;
      
      // Filtrar solo oportunidades ejecutables
      const executableOpps = allOpportunities.filter(o => o.strategy !== 'CROSS_CHAIN');
      
      if (executableOpps.length > 0) {
        executableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        state.opportunities = [...executableOpps.slice(0, 10), ...state.opportunities].slice(0, 50);
        state.stats.lastOpportunity = executableOpps[0];
        
        const best = executableOpps[0];
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${executableOpps.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName} (${best.strategy})`);
        
        // EJECUTAR
        if (!state.isDryRun && CONFIG.AUTO_EXECUTE && best.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
          state.stats.tradesAttempted++;
          
          const result = await executeScalp(best);
          
          if (result) {
            state.stats.tradesExecuted++;
            
            const tradeLog = {
              id: `scalp-${Date.now()}`,
              timestamp: Date.now(),
              chain: best.chain,
              chainName: best.chainName,
              strategy: best.strategy,
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
            }
            
            state.stats.winRate = state.stats.tradesExecuted > 0 
              ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100 
              : 0;
          }
        }
      }
    } else {
      if (state.stats.totalScans % 20 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 50 scans
    if (state.stats.totalScans % 50 === 0) {
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
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
    scansPerSecond: 0, uptime: 0, currentChain: 'all',
    lastOpportunity: null, lastTrade: null, priceData: {}
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER V2 iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_V2',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_V2',
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
║   🔥 SCALPER V2 - MULTI-ESTRATEGIA                                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 Estrategias:                                                             ║
║      • Intra-DEX (fee tiers)                                                  ║
║      • Triangular (WETH-USDC-DAI)                                             ║
║      • Cross-Chain (detección)                                                ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  console.log('\n[READY] 🔥 Scalper V2 listo.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




