/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estrategias:
 * 1. Uniswap V3 diferentes fee tiers
 * 2. Cross-DEX: Uniswap vs SushiSwap
 * 3. Triangular: WETH → USDC → DAI → WETH
 * 4. Tokens volátiles: Buscar spreads más grandes
 * 
 * EJECUTA AUTOMÁTICAMENTE cuando encuentra profit > $0.001
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
  SCAN_INTERVAL_MS: 300,           // Escaneo rápido
  MIN_PROFIT_USD: 0.001,           // Profit mínimo muy bajo
  MAX_SLIPPAGE_BPS: 100,           // 1% slippage
  AUTO_EXECUTE: true,              // EJECUTAR AUTOMÁTICAMENTE
  ETH_PRICE_USD: 3500,
  
  // Cantidades a probar
  TRADE_AMOUNTS: [
    { eth: 0.005, label: '0.005 ETH' },
    { eth: 0.01, label: '0.01 ETH' },
    { eth: 0.02, label: '0.02 ETH' }
  ]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CHAINS Y DEXs
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
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',  // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'   // Coinbase ETH
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [100, 500, 3000, 10000]
      },
      aerodrome: {
        name: 'Aerodrome',
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
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
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dexs: {
      uniswapV3: {
        name: 'Uniswap V3',
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        fees: [100, 500, 3000, 10000]
      },
      sushiswap: {
        name: 'SushiSwap',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
      },
      camelot: {
        name: 'Camelot',
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    }
  }
};

// ABIs
const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'MULTI_DEX_SCALPER',
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
    currentStrategy: '',
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
  console.log('[INIT] 🔌 Conectando a chains y DEXs...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      providers[chainKey] = new ethers.JsonRpcProvider(chain.rpc);
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, providers[chainKey]);
      
      contracts[chainKey] = {
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        uniQuoter: new ethers.Contract(chain.dexs.uniswapV3.quoter, UNISWAP_QUOTER_ABI, providers[chainKey]),
        uniRouter: new ethers.Contract(chain.dexs.uniswapV3.router, UNISWAP_ROUTER_ABI, signers[chainKey])
      };
      
      // Agregar SushiSwap si existe
      if (chain.dexs.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.dexs.sushiswap.router, 
          SUSHI_ROUTER_ABI, 
          signers[chainKey]
        );
      }
      
      const balance = await providers[chainKey].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        ethPrice: 0,
        dexs: Object.keys(chain.dexs)
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | DEXs: ${Object.keys(chain.dexs).join(', ')}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: UNISWAP V3 DIFERENTES FEE TIERS
// ═══════════════════════════════════════════════════════════════════════════════

async function scanUniswapFeeTiers(chainKey) {
  const chain = CHAINS[chainKey];
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    } catch (e) {}
    
    const fees = chain.dexs.uniswapV3.fees;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < fees.length; i++) {
        for (let j = 0; j < fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  strategy: 'UNI_FEE_TIERS',
                  dex: 'Uniswap V3',
                  route: `${fees[i]/100}%→${fees[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: fees[i],
                  fee2: fees[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  netProfitUsd,
                  gasCostUsd,
                  ethPrice,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDex(chainKey) {
  if (chainKey !== 'arbitrum') return [];
  
  const chain = CHAINS[chainKey];
  const uniQuoter = contracts[chainKey].uniQuoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const opportunities = [];
  
  if (!sushiRouter) return [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n; // Más gas para cross-dex
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar USDC en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        // SushiSwap quote: USDC → WETH
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit = wethFromSushi - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'Uniswap→SushiSwap',
              route: 'Buy Uni, Sell Sushi',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromUni,
              wethOut: wethFromSushi,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
        
        // Ruta 2: Comprar USDC en SushiSwap, vender en Uniswap
        const sushiAmounts2 = await sushiRouter.getAmountsOut(
          amountWei,
          [chain.tokens.WETH, chain.tokens.USDC]
        );
        const usdcFromSushi = sushiAmounts2[1];
        
        const uniQuote2 = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethFromUni = uniQuote2[0];
        
        const grossProfit2 = wethFromUni - amountWei;
        const netProfit2 = grossProfit2 - gasCostWei;
        
        if (netProfit2 > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              dex: 'SushiSwap→Uniswap',
              route: 'Buy Sushi, Sell Uni',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcFromSushi,
              wethOut: wethFromUni,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangular(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.tokens.DAI) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
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
          fee: 100, // Stablecoins usan 0.01%
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
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→DAI→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              daiIntermediate: daiOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: USDC NATIVO vs BRIDGED (Base: USDC vs USDbC)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinArb(chainKey) {
  const chain = CHAINS[chainKey];
  
  // Solo Base tiene USDbC
  if (chainKey !== 'base' || !chain.tokens.USDbC) return [];
  
  const quoter = contracts[chainKey].uniQuoter;
  const opportunities = [];
  
  try {
    const feeData = await providers[chainKey].getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 350000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const { eth: amountEth } of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta: WETH → USDC → USDbC → WETH
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcOut = quote1[0];
        
        // USDC → USDbC (stablecoin swap)
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDC,
          tokenOut: chain.tokens.USDbC,
          amountIn: usdcOut,
          fee: 100,
          sqrtPriceLimitX96: 0n
        });
        const usdbcOut = quote2[0];
        
        // USDbC → WETH
        const quote3 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.USDbC,
          tokenOut: chain.tokens.WETH,
          amountIn: usdbcOut,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const wethOut = quote3[0];
        
        const grossProfit = wethOut - amountWei;
        const netProfit = grossProfit - gasCostWei;
        
        if (netProfit > 0n) {
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'STABLECOIN_ARB',
              dex: 'Uniswap V3',
              route: 'WETH→USDC→USDbC→WETH',
              amountIn: amountWei,
              amountInEth: amountEth,
              usdcIntermediate: usdcOut,
              usdbcIntermediate: usdbcOut,
              wethOut,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
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
  const { uniRouter, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Strategy: ${opp.strategy}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.dexs.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.dexs.uniswapV3.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await uniRouter.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
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
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    let allOpportunities = [];
    
    // Ejecutar TODAS las estrategias
    state.stats.currentStrategy = 'UNI_FEE_TIERS';
    const feeTierOpps = await scanUniswapFeeTiers(selectedChain);
    allOpportunities.push(...feeTierOpps);
    
    state.stats.currentStrategy = 'CROSS_DEX';
    const crossDexOpps = await scanCrossDex(selectedChain);
    allOpportunities.push(...crossDexOpps);
    
    state.stats.currentStrategy = 'TRIANGULAR';
    const triangularOpps = await scanTriangular(selectedChain);
    allOpportunities.push(...triangularOpps);
    
    state.stats.currentStrategy = 'STABLECOIN_ARB';
    const stablecoinOpps = await scanStablecoinArb(selectedChain);
    allOpportunities.push(...stablecoinOpps);
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${allOpportunities.length} OPORTUNIDADES ENCONTRADAS!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
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
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | No opportunities`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
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
    scansPerSecond: 0, uptime: 0, currentChain: 'base', currentStrategy: '',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 MULTI-DEX SCALPER - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Estrategias: Fee Tiers, Cross-DEX, Triangular, Stablecoin Arb`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'MULTI_DEX_SCALPER',
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
    mode: 'MULTI_DEX_SCALPER',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: ['UNI_FEE_TIERS', 'CROSS_DEX', 'TRIANGULAR', 'STABLECOIN_ARB'],
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
║   🔥 MULTI-DEX SCALPER - CAPTURA OPORTUNIDADES EN VIVO                        ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      • Uniswap V3 Fee Tiers (100, 500, 3000, 10000 bps)                       ║
║      • Cross-DEX (Uniswap ↔ SushiSwap)                                        ║
║      • Triangular (WETH → USDC → DAI → WETH)                                  ║
║      • Stablecoin Arb (USDC ↔ USDbC)                                          ║
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





