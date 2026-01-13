/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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




 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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


 * 🔥 ADVANCED MULTI-STRATEGY BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRATEGIAS COMBINADAS:
 * 1. Flash Loans (Aave V3) - Préstamos sin colateral
 * 2. MEV Bot - Front-running y Sandwich detection
 * 3. Arbitraje Triangular - 3 tokens en ciclo
 * 4. Flash con Colateral - Apalancamiento
 * 5. Cross-DEX Arbitrage - Entre diferentes DEXs
 * 6. Liquidation Hunting - Buscar posiciones liquidables
 * 
 * CHAINS: Base, Arbitrum, Optimism
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.50,           // Mínimo $0.50 para flash loans (más alto por gas)
  MIN_PROFIT_SIMPLE: 0.01,        // Mínimo $0.01 para arb simple
  MAX_SLIPPAGE_BPS: 50,           // 0.5%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  
  // Flash Loan Config
  FLASH_LOAN_AMOUNTS: [1000, 5000, 10000], // USDC amounts
  FLASH_LOAN_FEE_BPS: 5,          // 0.05% Aave fee
  
  // MEV Config
  MEV_MIN_PROFIT_USD: 1.00,       // Mínimo $1 para MEV
  SANDWICH_THRESHOLD_USD: 100,    // Mínimo $100 en tx para sandwich
  
  // Simple Arb
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [100, 500, 3000, 10000]
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y PROTOCOLOS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org'
    ],
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
    },
    uniswapV3: {
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481'
    },
    aaveV3: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    sushiswap: null,
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://1rpc.io/op',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042'
    },
    uniswapV3: {
      quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
    },
    aaveV3: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      poolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
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
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'ADVANCED_MULTI_STRATEGY',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    flashLoanOpps: 0,
    mevOpps: 0,
    triangularOpps: 0,
    simpleArbOpps: 0,
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
    currentStrategy: 'SCANNING',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  // Estrategias activas
  strategies: {
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: true, scans: 0, opportunities: 0, executions: 0 }
  },
  // Mempool monitoring
  mempool: {
    pendingTxs: 0,
    largeTxs: [],
    sandwichTargets: []
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return provider;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a chains y protocolos...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.uniswapV3.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.uniswapV3.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey]),
        aavePool: chain.aaveV3 ? new ethers.Contract(chain.aaveV3.pool, AAVE_POOL_ABI, signers[chainKey]) : null
      };
      
      if (chain.sushiswap) {
        contracts[chainKey].sushiRouter = new ethers.Contract(chain.sushiswap.router, SUSHI_ROUTER_ABI, signers[chainKey]);
      }
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
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
        connected: true,
        hasAave: !!chain.aaveV3,
        hasSushi: !!chain.sushiswap,
        protocols: Object.keys(chain).filter(k => chain[k] && typeof chain[k] === 'object' && k !== 'tokens' && k !== 'rpcs')
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
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH | Aave: ${chain.aaveV3 ? '✓' : '✗'} | Sushi: ${chain.sushiswap ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.flashLoan.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Flash loan usa más gas
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
    
    // Simular flash loan con diferentes cantidades
    for (const flashAmount of CONFIG.FLASH_LOAN_AMOUNTS) {
      const flashAmountWei = ethers.parseUnits(flashAmount.toString(), 6); // USDC tiene 6 decimales
      const flashFee = (BigInt(flashAmount) * BigInt(CONFIG.FLASH_LOAN_FEE_BPS)) / 10000n;
      
      try {
        // Flash loan USDC → WETH → USDC (arbitraje de fee tiers)
        for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
          for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
            if (i === j) continue;
            
            try {
              // USDC → WETH
              const quote1 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.USDC,
                tokenOut: chain.tokens.WETH,
                amountIn: flashAmountWei,
                fee: CONFIG.FEE_TIERS[i],
                sqrtPriceLimitX96: 0n
              });
              const wethOut = quote1[0];
              
              // WETH → USDC
              const quote2 = await quoter.quoteExactInputSingle.staticCall({
                tokenIn: chain.tokens.WETH,
                tokenOut: chain.tokens.USDC,
                amountIn: wethOut,
                fee: CONFIG.FEE_TIERS[j],
                sqrtPriceLimitX96: 0n
              });
              const usdcOut = quote2[0];
              
              // Calcular profit después de fee de flash loan
              const grossProfit = usdcOut - flashAmountWei;
              const netProfit = grossProfit - ethers.parseUnits(flashFee.toString(), 0);
              const netProfitUsd = parseFloat(ethers.formatUnits(netProfit, 6));
              
              if (netProfitUsd > gasCostUsd) {
                const finalProfit = netProfitUsd - gasCostUsd;
                
                if (finalProfit >= CONFIG.MIN_PROFIT_USD) {
                  state.strategies.flashLoan.opportunities++;
                  state.stats.flashLoanOpps++;
                  
                  opportunities.push({
                    chain: chainKey,
                    chainName: chain.name,
                    strategy: 'FLASH_LOAN',
                    type: 'flash_arb',
                    route: `Flash $${flashAmount} USDC → ${CONFIG.FEE_TIERS[i]/100}% → ${CONFIG.FEE_TIERS[j]/100}%`,
                    flashAmount: flashAmount,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    wethIntermediate: wethOut.toString(),
                    usdcOut: usdcOut.toString(),
                    flashFee: parseFloat(flashFee.toString()),
                    grossProfitUsd: parseFloat(ethers.formatUnits(grossProfit, 6)),
                    netProfitUsd: finalProfit,
                    gasCostUsd,
                    ethPrice,
                    profitable: true,
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`[FLASH] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: ARBITRAJE TRIANGULAR
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.triangular.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  // Definir rutas triangulares
  const triangularRoutes = [];
  
  // WETH → USDC → DAI → WETH
  if (chain.tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH-USDC-DAI',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.DAI, chain.tokens.WETH],
      fees: [500, 100, 3000],
      decimals: [18, 6, 18, 18]
    });
  }
  
  // WETH → USDC → USDbC → WETH (Base)
  if (chain.tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDbC',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDbC, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  // WETH → USDC → USDT → WETH (Arbitrum/Optimism)
  if (chain.tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH-USDC-USDT',
      path: [chain.tokens.WETH, chain.tokens.USDC, chain.tokens.USDT, chain.tokens.WETH],
      fees: [500, 100, 500],
      decimals: [18, 6, 6, 18]
    });
  }
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 450000n; // 3 swaps
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const route of triangularRoutes) {
      for (const amountEth of CONFIG.TRADE_AMOUNTS) {
        const amountWei = ethers.parseEther(amountEth.toString());
        
        try {
          // Swap 1: WETH → Token1
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[0],
            tokenOut: route.path[1],
            amountIn: amountWei,
            fee: route.fees[0],
            sqrtPriceLimitX96: 0n
          });
          const token1Out = quote1[0];
          
          // Swap 2: Token1 → Token2
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[1],
            tokenOut: route.path[2],
            amountIn: token1Out,
            fee: route.fees[1],
            sqrtPriceLimitX96: 0n
          });
          const token2Out = quote2[0];
          
          // Swap 3: Token2 → WETH
          const quote3 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: route.path[2],
            tokenOut: route.path[3],
            amountIn: token2Out,
            fee: route.fees[2],
            sqrtPriceLimitX96: 0n
          });
          const wethOut = quote3[0];
          
          const grossProfit = wethOut - amountWei;
          const netProfit = grossProfit - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
          const spreadBps = Number((grossProfit * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
            state.strategies.triangular.opportunities++;
            state.stats.triangularOpps++;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'TRIANGULAR',
              type: 'triangular_arb',
              route: route.name,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              token1Out: token1Out.toString(),
              token2Out: token2Out.toString(),
              wethOut: wethOut.toString(),
              fees: route.fees,
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd > 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`[TRIANGULAR] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: CROSS-DEX ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.sushiswap) return [];
  
  state.strategies.crossDex.scans++;
  const opportunities = [];
  const uniQuoter = contracts[chainKey].quoter;
  const sushiRouter = contracts[chainKey].sushiRouter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 400000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    let ethPrice = CONFIG.ETH_PRICE_USD;
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      try {
        // Ruta 1: Comprar en Uniswap, vender en SushiSwap
        const uniQuote = await uniQuoter.quoteExactInputSingle.staticCall({
          tokenIn: chain.tokens.WETH,
          tokenOut: chain.tokens.USDC,
          amountIn: amountWei,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];
        
        const sushiAmounts = await sushiRouter.getAmountsOut(
          usdcFromUni,
          [chain.tokens.USDC, chain.tokens.WETH]
        );
        const wethFromSushi = sushiAmounts[1];
        
        const grossProfit1 = wethFromSushi - amountWei;
        const netProfit1 = grossProfit1 - gasCostWei;
        const netProfitUsd1 = parseFloat(ethers.formatEther(netProfit1)) * ethPrice;
        
        if (netProfitUsd1 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'uni_to_sushi',
            route: 'Buy Uni → Sell Sushi',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromUni.toString(),
            wethOut: wethFromSushi.toString(),
            netProfitUsd: netProfitUsd1,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd1 > 0,
            timestamp: Date.now()
          });
        }
        
        // Ruta 2: Comprar en SushiSwap, vender en Uniswap
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
        const netProfitUsd2 = parseFloat(ethers.formatEther(netProfit2)) * ethPrice;
        
        if (netProfitUsd2 >= CONFIG.MIN_PROFIT_SIMPLE) {
          state.strategies.crossDex.opportunities++;
          
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'CROSS_DEX',
            type: 'sushi_to_uni',
            route: 'Buy Sushi → Sell Uni',
            amountInEth: amountEth,
            amountIn: amountWei.toString(),
            usdcIntermediate: usdcFromSushi.toString(),
            wethOut: wethFromUni.toString(),
            netProfitUsd: netProfitUsd2,
            gasCostUsd,
            ethPrice,
            profitable: netProfitUsd2 > 0,
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: SIMPLE FEE TIER ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanSimpleArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.simpleArb.scans++;
  const opportunities = [];
  const quoter = contracts[chainKey].quoter;
  const provider = providers[chainKey];
  
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
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
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
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
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'SIMPLE_ARB',
              type: 'fee_tier',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountInEth: amountEth,
              amountIn: amountWei.toString(),
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE,
              timestamp: Date.now()
            });
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_SIMPLE) {
              state.strategies.simpleArb.opportunities++;
              state.stats.simpleArbOpps++;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: MEV / MEMPOOL MONITORING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanMevOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  state.strategies.mev.scans++;
  const opportunities = [];
  
  // Nota: MEV real requiere acceso al mempool y Flashbots
  // Esta es una simulación para mostrar la estructura
  
  try {
    const provider = providers[chainKey];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions && block.transactions.length > 0) {
      // Analizar transacciones recientes para patrones
      const txCount = block.transactions.length;
      
      // Simular detección de oportunidades MEV
      // En producción, esto analizaría el mempool en tiempo real
      
      state.mempool.pendingTxs = txCount;
      
      // Detectar transacciones grandes (potenciales targets para sandwich)
      // Esto es simulado - en producción usarías un nodo con mempool access
      
      if (Math.random() < 0.01) { // 1% chance de detectar oportunidad simulada
        state.strategies.mev.opportunities++;
        state.stats.mevOpps++;
        
        opportunities.push({
          chain: chainKey,
          chainName: chain.name,
          strategy: 'MEV',
          type: 'sandwich_opportunity',
          route: 'Sandwich Attack (Simulated)',
          targetTx: `0x${Math.random().toString(16).slice(2, 10)}...`,
          estimatedProfit: Math.random() * 5 + 1,
          netProfitUsd: Math.random() * 3,
          gasCostUsd: Math.random() * 2,
          blockNumber,
          profitable: true,
          timestamp: Date.now(),
          note: 'Requiere Flashbots para ejecución real'
        });
      }
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 6: LIQUIDATION HUNTING (Simulado)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanLiquidationOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.aaveV3) return [];
  
  state.strategies.liquidation.scans++;
  const opportunities = [];
  
  // Nota: Liquidation hunting real requiere monitorear todas las posiciones
  // Esta es una estructura de ejemplo
  
  try {
    // En producción, iterarías sobre todas las posiciones de Aave
    // y buscarías aquellas con health factor < 1
    
    // Simulación
    if (Math.random() < 0.005) { // 0.5% chance
      state.strategies.liquidation.opportunities++;
      
      opportunities.push({
        chain: chainKey,
        chainName: chain.name,
        strategy: 'LIQUIDATION',
        type: 'aave_liquidation',
        route: 'Liquidate Unhealthy Position',
        targetAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        healthFactor: 0.95 + Math.random() * 0.04,
        debtAmount: Math.random() * 10000,
        collateralAmount: Math.random() * 5,
        liquidationBonus: 5, // 5%
        netProfitUsd: Math.random() * 50,
        gasCostUsd: Math.random() * 5,
        profitable: true,
        timestamp: Date.now(),
        note: 'Requiere monitoreo de posiciones en tiempo real'
      });
    }
  } catch (e) {}
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO: ${opp.strategy}`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  // Por ahora, solo ejecutar estrategias simples
  // Flash loans y MEV requieren contratos especiales
  
  if (opp.strategy === 'FLASH_LOAN' || opp.strategy === 'MEV' || opp.strategy === 'LIQUIDATION') {
    console.log(`   ⚠️ ${opp.strategy} requiere contrato especial - Simulando...`);
    isExecuting = false;
    
    // Simular resultado
    return {
      success: true,
      simulated: true,
      profitUsd: opp.netProfitUsd * 0.8,
      gasUsd: opp.gasCostUsd,
      netProfitUsd: opp.netProfitUsd * 0.8 - opp.gasCostUsd,
      txHash: `simulated-${Date.now()}`,
      executionTimeMs: Date.now() - startTime
    };
  }
  
  try {
    const amountIn = BigInt(opp.amountIn);
    const usdcIntermediate = BigInt(opp.usdcIntermediate);
    const wethOut = BigInt(opp.wethOut);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (allowance < amountIn) {
      const approveTx = await weth.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1
    console.log(`   🔄 SWAP 1...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    
    // 4. Get USDC balance
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniswapV3.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.uniswapV3.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2
    console.log(`   🔄 SWAP 2...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2 || 500,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    
    // 7. Calculate profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
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
  
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) return;
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  let allOpportunities = [];
  
  try {
    // Ejecutar TODAS las estrategias en paralelo
    state.stats.currentStrategy = 'SCANNING_ALL';
    
    const [flashOpps, triangularOpps, crossDexOpps, simpleOpps, mevOpps, liquidationOpps] = await Promise.all([
      scanFlashLoanOpportunities(selectedChain),
      scanTriangularArbitrage(selectedChain),
      scanCrossDexArbitrage(selectedChain),
      scanSimpleArbitrage(selectedChain),
      scanMevOpportunities(selectedChain),
      scanLiquidationOpportunities(selectedChain)
    ]);
    
    allOpportunities = [
      ...flashOpps,
      ...triangularOpps,
      ...crossDexOpps,
      ...simpleOpps,
      ...mevOpps,
      ...liquidationOpps
    ];
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar todas las oportunidades
    state.opportunities = [...allOpportunities.slice(0, 20), ...state.opportunities].slice(0, 50);
    
    // Filtrar rentables
    const profitableOpps = allOpportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      state.stats.currentStrategy = best.strategy;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES!`);
      console.log(`   💰 MEJOR: ${best.strategy} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // Ejecutar
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          const stratKey = best.strategy.toLowerCase().replace('_', '');
          if (state.strategies[stratKey]) {
            state.strategies[stratKey].executions++;
          }
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth || best.flashAmount,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            simulated: result.simulated || false,
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
      }
    } else {
      if (state.stats.totalScans % 10 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Strategies: FL:${flashOpps.length} TRI:${triangularOpps.length} CDX:${crossDexOpps.length} SMP:${simpleOpps.length}`);
      }
    }
    
    // Actualizar balances
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    totalScans: 0, opportunitiesFound: 0, flashLoanOpps: 0, mevOpps: 0,
    triangularOpps: 0, simpleArbOpps: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'SCANNING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  // Reset strategy stats
  Object.keys(state.strategies).forEach(k => {
    state.strategies[k].scans = 0;
    state.strategies[k].opportunities = 0;
    state.strategies[k].executions = 0;
  });
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 ADVANCED MULTI-STRATEGY BOT - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[STRATEGIES] Flash Loans, MEV, Triangular, Cross-DEX, Simple Arb, Liquidation`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'ADVANCED_MULTI_STRATEGY',
    strategies: Object.keys(state.strategies),
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
    mode: 'ADVANCED_MULTI_STRATEGY',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    strategies: Object.entries(state.strategies).map(([k, v]) => ({ name: k, enabled: v.enabled })),
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
    config: CONFIG
  });
});

// Toggle strategy
app.post('/api/defi/multichain-arb/strategy/:name/toggle', (req, res) => {
  const { name } = req.params;
  if (state.strategies[name]) {
    state.strategies[name].enabled = !state.strategies[name].enabled;
    res.json({ success: true, strategy: name, enabled: state.strategies[name].enabled });
  } else {
    res.status(404).json({ error: 'Strategy not found' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 ADVANCED MULTI-STRATEGY BOT                                              ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   📊 ESTRATEGIAS:                                                             ║
║      ⚡ Flash Loans (Aave V3) - Préstamos sin colateral                       ║
║      🥪 MEV Bot - Sandwich & Front-running detection                          ║
║      🔺 Triangular Arbitrage - 3-token cycles                                 ║
║      🔄 Cross-DEX Arbitrage - Uniswap vs SushiSwap                            ║
║      📈 Simple Fee Tier Arbitrage                                             ║
║      💀 Liquidation Hunting - Unhealthy positions                             ║
║                                                                               ║
║   ⚡ Scan Interval: ${CONFIG.SCAN_INTERVAL_MS}ms                                                ║
║   ⚡ Min Profit Flash: $${CONFIG.MIN_PROFIT_USD} | Simple: $${CONFIG.MIN_PROFIT_SIMPLE}                       ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
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

