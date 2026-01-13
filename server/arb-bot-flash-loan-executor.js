/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);




 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);


 * ⚡ FLASH LOAN ARBITRAGE EXECUTOR BOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que escanea y ejecuta oportunidades de arbitraje REALES usando:
 * - Flash Loans de Aave V3 ($1k-$10k sin colateral)
 * - Intra-DEX (diferentes fee tiers)
 * - Cross-DEX (Uniswap V3 ↔ SushiSwap/Velodrome)
 * - Triangular (WETH → USDC → DAI → WETH)
 * 
 * Contratos FlashLoanArbitrage desplegados:
 * - Base: 0x029e1b46b97E41cC6c454313f42C6D5b744839d1
 * - Arbitrum: 0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E
 * - Optimism: 0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF
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
  SCAN_INTERVAL_MS: 800,            // Escanear cada 0.8 segundos (MÁS RÁPIDO)
  MIN_PROFIT_USD: 0.001,            // Mínimo $0.001 profit neto (ULTRA AGRESIVO)
  MIN_PROFIT_BPS: 1,                // Mínimo 0.01% spread
  MAX_SLIPPAGE_BPS: 150,            // 1.5% slippage máximo
  FLASH_LOAN_AMOUNTS: [100, 250, 500, 1000, 2000, 5000, 10000], // Más opciones de flash loan
  TRADE_AMOUNTS_ETH: [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01], // Más granularidad
  ETH_PRICE_USD: 3400,              // Precio ETH actualizado
  GAS_MULTIPLIER: 1.2,              // Buffer de gas reducido
  EXECUTE_REAL: true,               // Ejecutar transacciones reales
  MAX_CONCURRENT_SCANS: 5,          // Más scans paralelos
  COOLDOWN_AFTER_TRADE_MS: 1000,    // Cooldown reducido a 1s
  SCAN_ALL_PAIRS: true,             // Escanear todos los pares
  AGGRESSIVE_MODE: true             // Modo agresivo activado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS FLASH LOAN DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_LOAN_CONTRACTS = {
  base: '0x029e1b46b97E41cC6c454313f42C6D5b744839d1',
  arbitrum: '0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E',
  optimism: '0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF'
};

const MULTI_DEX_CONTRACTS = {
  base: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496',
  arbitrum: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
      DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
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
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDbC', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'WETH', tokenB: 'cbETH', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'DAI', decimalsA: 18, decimalsB: 18 }
    ]
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔷',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e bridged
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    },
    dexs: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      camelot: {
        router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      }
    },
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 },
      { tokenA: 'WETH', tokenB: 'ARB', decimalsA: 18, decimalsB: 18 }
    ]
  },
  optimism: {
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      OP: '0x4200000000000000000000000000000000000042',
      sUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
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
    aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    feeTiers: [100, 500, 3000, 10000],
    strategies: ['intraDex', 'crossDex', 'triangular', 'flashLoan', 'stablecoin'],
    // Pares adicionales para arbitraje
    extraPairs: [
      { tokenA: 'USDC', tokenB: 'USDCe', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'USDT', decimalsA: 6, decimalsB: 6 },
      { tokenA: 'USDC', tokenB: 'DAI', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'USDC', tokenB: 'sUSD', decimalsA: 6, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'OP', decimalsA: 18, decimalsB: 18 },
      { tokenA: 'WETH', tokenB: 'WBTC', decimalsA: 18, decimalsB: 8 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const FLASH_LOAN_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalFlashLoans() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function successfulArbitrages() view returns (uint256)',
  'function minProfitBps() view returns (uint256)',
  'function maxSlippageBps() view returns (uint256)',
  'function paused() view returns (bool)',
  'function getStats() view returns (uint256 _totalFlashLoans, uint256 _totalProfitWei, uint256 _successfulArbitrages)',
  'function getConfig() view returns (uint256 _minProfitBps, uint256 _maxSlippageBps, bool _paused)',
  // Flash Loan execution
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  // Direct arbitrage (sin flash loan)
  'function executeDirectArbitrage(address asset, uint256 amount, uint8 strategy, bytes calldata strategyParams) external returns (uint256 profit)',
  // Admin
  'function setMinProfitBps(uint256 _minProfitBps) external',
  'function setMaxSlippageBps(uint256 _maxSlippageBps) external',
  'function setPaused(bool _paused) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  lastTradeTime: null,
  currentChain: null,
  
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    profitableOpps: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0
  },
  
  strategies: {
    intraDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    crossDex: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    triangular: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    flashLoan: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 },
    stablecoin: { enabled: true, scans: 0, opportunities: 0, executions: 0, profit: 0 }
  },
  
  chains: {},
  opportunities: [],
  recentTrades: [],
  activityLog: [],
  
  providers: {},
  wallets: {},
  contracts: {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeBot() {
  console.log('\n⚡ Inicializando Flash Loan Arbitrage Bot...\n');
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Verificar conexión
      const blockNumber = await provider.getBlockNumber();
      const balance = await provider.getBalance(wallet.address);
      
      state.providers[chainKey] = provider;
      state.wallets[chainKey] = wallet;
      
      // Inicializar contratos
      state.contracts[chainKey] = {};
      
      // Flash Loan Contract
      if (FLASH_LOAN_CONTRACTS[chainKey]) {
        state.contracts[chainKey].flashLoan = new ethers.Contract(
          FLASH_LOAN_CONTRACTS[chainKey],
          FLASH_LOAN_ABI,
          wallet
        );
      }
      
      // Quoter
      if (chainConfig.dexs.uniswapV3) {
        state.contracts[chainKey].quoter = new ethers.Contract(
          chainConfig.dexs.uniswapV3.quoter,
          QUOTER_ABI,
          provider
        );
      }
      
      // Sushi Router (Arbitrum)
      if (chainConfig.dexs.sushiswap) {
        state.contracts[chainKey].sushiRouter = new ethers.Contract(
          chainConfig.dexs.sushiswap.router,
          SUSHI_ROUTER_ABI,
          wallet
        );
      }
      
      state.chains[chainKey] = {
        ...chainConfig,
        connected: true,
        balance: ethers.formatEther(balance),
        balanceUsd: parseFloat(ethers.formatEther(balance)) * CONFIG.ETH_PRICE_USD,
        lastBlock: blockNumber,
        lastScan: null,
        flashLoanContract: FLASH_LOAN_CONTRACTS[chainKey] || null
      };
      
      console.log(`${chainConfig.icon} ${chainConfig.name}: Conectado | Block: ${blockNumber} | Balance: ${ethers.formatEther(balance).slice(0, 8)} ETH`);
      
      // Verificar contrato Flash Loan
      if (state.contracts[chainKey].flashLoan) {
        try {
          const stats = await state.contracts[chainKey].flashLoan.getStats();
          console.log(`   ⚡ FlashLoan Contract: ${stats[0].toString()} loans, ${ethers.formatEther(stats[1])} ETH profit`);
        } catch (e) {
          console.log(`   ⚡ FlashLoan Contract: Listo`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error conectando a ${chainConfig.name}: ${error.message}`);
      state.chains[chainKey] = {
        ...chainConfig,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        error: error.message
      };
    }
  }
  
  console.log('\n✅ Bot inicializado\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function getUniswapQuote(chainKey, tokenIn, tokenOut, amountIn, fee) {
  try {
    const quoter = state.contracts[chainKey].quoter;
    if (!quoter) return null;
    
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0
    };
    
    // Agregar timeout de 3 segundos para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), 3000)
    );
    
    const quotePromise = quoter.quoteExactInputSingle.staticCall(params);
    const result = await Promise.race([quotePromise, timeoutPromise]);
    return result[0]; // amountOut
  } catch (error) {
    return null;
  }
}

async function getSushiQuote(chainKey, tokenIn, tokenOut, amountIn) {
  try {
    const sushiRouter = state.contracts[chainKey].sushiRouter;
    if (!sushiRouter) return null;
    
    const amounts = await sushiRouter.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return amounts[1];
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 1: INTRA-DEX ARBITRAGE (Fee Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanIntraDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.intraDex.scans++;
  
  const opportunities = [];
  
  // Solo usar 3 montos para ser más rápido
  const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
  // Solo los fee tiers más usados
  const fees = [500, 3000];
  
  // WETH ↔ USDC entre diferentes fee tiers
  for (const amountEth of quickAmounts) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Obtener quotes para fee tiers seleccionados
    const quotes = {};
    const quotePromises = fees.map(async (fee) => {
      const quote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (quote) quotes[fee] = quote;
    });
    await Promise.all(quotePromises);
    
    // Buscar arbitraje entre fee tiers
    const feeList = Object.keys(quotes).map(Number);
    for (let i = 0; i < feeList.length; i++) {
      for (let j = 0; j < feeList.length; j++) {
        if (i === j) continue;
        
        const fee1 = feeList[i];
        const fee2 = feeList[j];
        const usdcOut = quotes[fee1];
        
        // Cotizar el swap de vuelta
        const wethBack = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcOut, fee2);
        if (!wethBack) continue;
        
        const profitWei = wethBack - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
        
        // Estimar gas
        const gasCostUsd = 0.15; // ~$0.15 en L2
        const netProfitUsd = profitUsd - gasCostUsd;
        
        if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
          opportunities.push({
            chain: chainKey,
            chainName: chain.name,
            strategy: 'intraDex',
            type: 'FEE_TIER_ARB',
            route: `WETH→USDC(${fee1/10000}%)→WETH(${fee2/10000}%)`,
            amountInEth: amountEth,
            amountIn: amountIn.toString(),
            fee1,
            fee2,
            usdcOut: usdcOut.toString(),
            wethBack: wethBack.toString(),
            profitWei: profitWei.toString(),
            profitEth,
            profitUsd,
            gasCostUsd,
            netProfitUsd,
            spreadBps: Math.round((profitEth / amountEth) * 10000),
            profitable: true,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.intraDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 2: CROSS-DEX ARBITRAGE (Uniswap ↔ SushiSwap)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanCrossDexOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain.dexs.sushiswap && !chain.dexs.velodrome) return [];
  
  const tokens = chain.tokens;
  state.strategies.crossDex.scans++;
  
  const opportunities = [];
  
  for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
    const amountIn = ethers.parseEther(amountEth.toString());
    
    // Uniswap V3 quotes
    for (const fee of chain.feeTiers) {
      const uniQuote = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, amountIn, fee);
      if (!uniQuote) continue;
      
      // SushiSwap quote
      const sushiQuote = await getSushiQuote(chainKey, tokens.WETH, tokens.USDC, amountIn);
      if (!sushiQuote) continue;
      
      // Comparar precios
      // Caso 1: Comprar en Uni, vender en Sushi
      if (uniQuote > sushiQuote) {
        // Comprar USDC en Sushi (más barato), vender en Uni (más caro)
        const usdcFromSushi = sushiQuote;
        const wethFromUni = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromSushi, fee);
        if (wethFromUni) {
          const profitWei = wethFromUni - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Sushi)→WETH(Uni${fee/10000}%)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'sushi',
              sellDex: 'uniswap',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Caso 2: Comprar en Sushi, vender en Uni
      if (sushiQuote > uniQuote) {
        const usdcFromUni = uniQuote;
        const wethFromSushi = await getSushiQuote(chainKey, tokens.USDC, tokens.WETH, usdcFromUni);
        if (wethFromSushi) {
          const profitWei = wethFromSushi - amountIn;
          const profitEth = parseFloat(ethers.formatEther(profitWei));
          const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
          const gasCostUsd = 0.20;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'crossDex',
              type: 'CROSS_DEX_ARB',
              route: `WETH→USDC(Uni${fee/10000}%)→WETH(Sushi)`,
              amountInEth: amountEth,
              amountIn: amountIn.toString(),
              fee,
              buyDex: 'uniswap',
              sellDex: 'sushi',
              profitWei: profitWei.toString(),
              profitEth,
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitEth / amountEth) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.crossDex.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 3: TRIANGULAR ARBITRAGE (WETH → USDC → DAI → WETH)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanTriangularOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  state.strategies.triangular.scans++;
  
  const opportunities = [];
  
  // Definir múltiples rutas triangulares
  const triangularRoutes = [];
  
  // Ruta 1: WETH → USDC → DAI → WETH (si DAI existe)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→USDC→DAI→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.DAI],
      decimals: [18, 6, 18]
    });
  }
  
  // Ruta 2: WETH → USDC → USDT → WETH (si USDT existe)
  if (tokens.USDT) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDT→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDT],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 3: WETH → USDC → USDCe → WETH (si USDCe existe - Arbitrum/Optimism)
  if (tokens.USDCe) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDCe→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDCe],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 4: WETH → USDC → USDbC → WETH (si USDbC existe - Base)
  if (tokens.USDbC) {
    triangularRoutes.push({
      name: 'WETH→USDC→USDbC→WETH',
      tokens: [tokens.WETH, tokens.USDC, tokens.USDbC],
      decimals: [18, 6, 6]
    });
  }
  
  // Ruta 5: WETH → DAI → USDC → WETH (inversa)
  if (tokens.DAI) {
    triangularRoutes.push({
      name: 'WETH→DAI→USDC→WETH',
      tokens: [tokens.WETH, tokens.DAI, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  // Ruta 6: Con tokens nativos (OP, ARB)
  if (tokens.OP) {
    triangularRoutes.push({
      name: 'WETH→OP→USDC→WETH',
      tokens: [tokens.WETH, tokens.OP, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  if (tokens.ARB) {
    triangularRoutes.push({
      name: 'WETH→ARB→USDC→WETH',
      tokens: [tokens.WETH, tokens.ARB, tokens.USDC],
      decimals: [18, 18, 6]
    });
  }
  
  for (const route of triangularRoutes) {
    // Solo usar los 3 montos más pequeños para ser más rápido
    const quickAmounts = CONFIG.TRADE_AMOUNTS_ETH.slice(0, 3);
    
    for (const amountEth of quickAmounts) {
      const amountIn = ethers.parseEther(amountEth.toString());
      
      // Solo probar las combinaciones de fees más comunes (reducido de 256 a 9 combinaciones)
      const feeOptions = [500, 3000];
      
      for (const feeAB of feeOptions) {
        for (const feeBC of [100, 500]) {
          for (const feeCA of feeOptions) {
            // Step 1: A → B
            const amountB = await getUniswapQuote(chainKey, route.tokens[0], route.tokens[1], amountIn, feeAB);
            if (!amountB) continue;
            
            // Step 2: B → C
            const amountC = await getUniswapQuote(chainKey, route.tokens[1], route.tokens[2], amountB, feeBC);
            if (!amountC) continue;
            
            // Step 3: C → A
            const amountABack = await getUniswapQuote(chainKey, route.tokens[2], route.tokens[0], amountC, feeCA);
            if (!amountABack) continue;
            
            const profitWei = amountABack - amountIn;
            const profitEth = parseFloat(ethers.formatEther(profitWei));
            const profitUsd = profitEth * CONFIG.ETH_PRICE_USD;
            const gasCostUsd = 0.20; // Gas en L2
            const netProfitUsd = profitUsd - gasCostUsd;
            
            if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'triangular',
                type: 'TRIANGULAR_ARB',
                route: `${route.name}(${feeAB/10000}%/${feeBC/10000}%/${feeCA/10000}%)`,
                amountInEth: amountEth,
                amountIn: amountIn.toString(),
                feeAB,
                feeBC,
                feeCA,
                amountB: amountB.toString(),
                amountC: amountC.toString(),
                amountABack: amountABack.toString(),
                profitWei: profitWei.toString(),
                profitEth,
                profitUsd,
                gasCostUsd,
                netProfitUsd,
                spreadBps: Math.round((profitEth / amountEth) * 10000),
                profitable: true,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.triangular.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 4: STABLECOIN ARBITRAGE (USDC ↔ USDbC, USDC ↔ USDCe)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanStablecoinOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const tokens = chain.tokens;
  
  // Verificar si hay pares de stablecoins en esta chain
  if (!chain.extraPairs) return [];
  
  const stablePairs = chain.extraPairs.filter(p => 
    (p.tokenA.includes('USD') || p.tokenA.includes('DAI')) && 
    (p.tokenB.includes('USD') || p.tokenB.includes('DAI'))
  );
  
  if (stablePairs.length === 0) return [];
  
  const opportunities = [];
  
  for (const pair of stablePairs) {
    const tokenA = tokens[pair.tokenA];
    const tokenB = tokens[pair.tokenB];
    
    if (!tokenA || !tokenB) continue;
    
    // Probar diferentes montos
    const testAmounts = [100, 500, 1000, 2000, 5000];
    
    for (const amountUsd of testAmounts) {
      const amountIn = ethers.parseUnits(amountUsd.toString(), pair.decimalsA);
      
      // Buscar el mejor fee tier para cada dirección
      for (const fee1 of chain.feeTiers) {
        // A → B
        const amountB = await getUniswapQuote(chainKey, tokenA, tokenB, amountIn, fee1);
        if (!amountB) continue;
        
        // B → A (con diferentes fees)
        for (const fee2 of chain.feeTiers) {
          const amountABack = await getUniswapQuote(chainKey, tokenB, tokenA, amountB, fee2);
          if (!amountABack) continue;
          
          const profitWei = amountABack - amountIn;
          const profitUsd = parseFloat(ethers.formatUnits(profitWei, pair.decimalsA));
          const gasCostUsd = 0.10; // Bajo en L2
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'stablecoin',
              type: 'STABLE_ARB',
              route: `${pair.tokenA}→${pair.tokenB}(${fee1/10000}%)→${pair.tokenA}(${fee2/10000}%)`,
              amountInUsd: amountUsd,
              amountIn: amountIn.toString(),
              fee1,
              fee2,
              tokenA: pair.tokenA,
              tokenB: pair.tokenB,
              amountB: amountB.toString(),
              amountABack: amountABack.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / amountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIA 5: FLASH LOAN ARBITRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function scanFlashLoanOpportunity(chainKey) {
  const chain = CHAINS[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  if (!flashLoanContract) return [];
  
  state.strategies.flashLoan.scans++;
  
  const opportunities = [];
  const tokens = chain.tokens;
  
  // Solo usar 3 montos de flash loan para ser más rápido
  const quickFlashAmounts = [500, 1000, 5000];
  
  // Escanear oportunidades con diferentes montos de flash loan
  for (const flashAmountUsd of quickFlashAmounts) {
    // Convertir USD a USDC (6 decimales)
    const flashAmount = ethers.parseUnits(flashAmountUsd.toString(), 6);
    
    // Solo probar los fee tiers más líquidos
    const feePairs = [[500, 3000], [3000, 500], [500, 10000], [10000, 500]];
    
    for (const [fee1, fee2] of feePairs) {
        
        // USDC → WETH (fee1) → USDC (fee2)
        const wethOut = await getUniswapQuote(chainKey, tokens.USDC, tokens.WETH, flashAmount, fee1);
        if (!wethOut) continue;
        
        const usdcBack = await getUniswapQuote(chainKey, tokens.WETH, tokens.USDC, wethOut, fee2);
        if (!usdcBack) continue;
        
        // Calcular profit después de fee de Aave (0.05%)
        const aaveFee = flashAmount * BigInt(5) / BigInt(10000);
        const totalDebt = flashAmount + aaveFee;
        
        if (usdcBack > totalDebt) {
          const profitUsdc = usdcBack - totalDebt;
          const profitUsd = parseFloat(ethers.formatUnits(profitUsdc, 6));
          const gasCostUsd = 0.30;
          const netProfitUsd = profitUsd - gasCostUsd;
          
          if (netProfitUsd > CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'flashLoan',
              type: 'FLASH_LOAN_ARB',
              route: `FLASH($${flashAmountUsd})→WETH(${fee1/10000}%)→USDC(${fee2/10000}%)`,
              flashAmountUsd,
              flashAmount: flashAmount.toString(),
              fee1,
              fee2,
              wethOut: wethOut.toString(),
              usdcBack: usdcBack.toString(),
              aaveFee: aaveFee.toString(),
              profitUsdc: profitUsdc.toString(),
              profitUsd,
              gasCostUsd,
              netProfitUsd,
              spreadBps: Math.round((profitUsd / flashAmountUsd) * 10000),
              profitable: true,
              timestamp: Date.now()
            });
          }
        }
    }
  }
  
  if (opportunities.length > 0) {
    state.strategies.flashLoan.opportunities += opportunities.length;
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTOR DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function executeOpportunity(opp) {
  const chainKey = opp.chain;
  const wallet = state.wallets[chainKey];
  const flashLoanContract = state.contracts[chainKey]?.flashLoan;
  
  if (!wallet || !flashLoanContract) {
    log(`❌ No hay wallet o contrato para ${chainKey}`, 'error');
    return null;
  }
  
  state.stats.tradesAttempted++;
  state.strategies[opp.strategy].executions++;
  
  const tradeId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  log(`🚀 EJECUTANDO ${opp.strategy.toUpperCase()} en ${opp.chainName}`, 'trade');
  log(`   Route: ${opp.route}`, 'info');
  log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`, 'info');
  
  try {
    let tx;
    let receipt;
    
    if (opp.strategy === 'flashLoan') {
      // Ejecutar Flash Loan
      const strategyCode = 1; // 1 = Intra-DEX
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.WETH, opp.fee1, opp.fee2]
      );
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'bytes'],
        [strategyCode, strategyParams]
      );
      
      log(`   ⚡ Ejecutando Flash Loan de $${opp.flashAmountUsd}...`, 'info');
      
      tx = await flashLoanContract.executeFlashLoan(
        CHAINS[chainKey].tokens.USDC,
        opp.flashAmount,
        params,
        { gasLimit: 500000 }
      );
      
    } else if (opp.strategy === 'intraDex') {
      // Ejecutar arbitraje directo
      const strategyCode = 1;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, opp.fee1, opp.fee2]
      );
      
      log(`   📈 Ejecutando Intra-DEX con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 400000, value: opp.amountIn }
      );
      
    } else if (opp.strategy === 'triangular') {
      // Ejecutar triangular
      const strategyCode = 3;
      const strategyParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'uint24', 'uint24'],
        [CHAINS[chainKey].tokens.USDC, CHAINS[chainKey].tokens.DAI, opp.feeAB, opp.feeBC, opp.feeCA]
      );
      
      log(`   🔺 Ejecutando Triangular con ${opp.amountInEth} ETH...`, 'info');
      
      tx = await flashLoanContract.executeDirectArbitrage(
        CHAINS[chainKey].tokens.WETH,
        opp.amountIn,
        strategyCode,
        strategyParams,
        { gasLimit: 600000, value: opp.amountIn }
      );
    }
    
    if (tx) {
      log(`   ⏳ TX enviada: ${tx.hash}`, 'info');
      receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const gasCostEth = parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice));
        const gasCostUsd = gasCostEth * CONFIG.ETH_PRICE_USD;
        const actualNetProfit = opp.profitUsd - gasCostUsd;
        
        state.stats.tradesSuccessful++;
        state.stats.totalProfitUsd += opp.profitUsd;
        state.stats.totalGasUsd += gasCostUsd;
        state.stats.netProfitUsd += actualNetProfit;
        state.strategies[opp.strategy].profit += actualNetProfit;
        
        const trade = {
          id: tradeId,
          timestamp: Date.now(),
          chain: chainKey,
          chainName: opp.chainName,
          strategy: opp.strategy,
          route: opp.route,
          amountIn: opp.amountInEth || opp.flashAmountUsd,
          expectedProfit: opp.profitUsd.toFixed(4),
          actualProfit: actualNetProfit.toFixed(4),
          gasCost: gasCostUsd.toFixed(4),
          txHash: tx.hash,
          status: 'success',
          blockNumber: receipt.blockNumber
        };
        
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) state.recentTrades.pop();
        
        log(`   ✅ ÉXITO! Profit: $${actualNetProfit.toFixed(4)} | Gas: $${gasCostUsd.toFixed(4)}`, 'success');
        log(`   🔗 ${CHAINS[chainKey].explorer}/tx/${tx.hash}`, 'info');
        
        return trade;
      }
    }
    
  } catch (error) {
    state.stats.tradesFailed++;
    log(`   ❌ Error: ${error.message}`, 'error');
    
    const trade = {
      id: tradeId,
      timestamp: Date.now(),
      chain: chainKey,
      chainName: opp.chainName,
      strategy: opp.strategy,
      route: opp.route,
      amountIn: opp.amountInEth || opp.flashAmountUsd,
      expectedProfit: opp.profitUsd.toFixed(4),
      status: 'failed',
      error: error.message
    };
    
    state.recentTrades.unshift(trade);
    if (state.recentTrades.length > 50) state.recentTrades.pop();
    
    return trade;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  if (!state.isRunning) return;
  
  const allOpportunities = [];
  
  for (const chainKey of Object.keys(CHAINS)) {
    if (!state.chains[chainKey]?.connected) continue;
    
    state.currentChain = chainKey;
    state.stats.totalScans++;
    
    try {
      // Escanear todas las estrategias
      const [intraDex, crossDex, triangular, flashLoan, stablecoin] = await Promise.all([
        state.strategies.intraDex.enabled ? scanIntraDexOpportunity(chainKey) : [],
        state.strategies.crossDex.enabled ? scanCrossDexOpportunity(chainKey) : [],
        state.strategies.triangular.enabled ? scanTriangularOpportunity(chainKey) : [],
        state.strategies.flashLoan.enabled ? scanFlashLoanOpportunity(chainKey) : [],
        state.strategies.stablecoin.enabled ? scanStablecoinOpportunity(chainKey) : []
      ]);
      
      allOpportunities.push(...intraDex, ...crossDex, ...triangular, ...flashLoan, ...stablecoin);
      
      state.chains[chainKey].lastScan = Date.now();
      
    } catch (error) {
      log(`Error escaneando ${chainKey}: ${error.message}`, 'error');
    }
  }
  
  // Ordenar por profit y tomar las mejores
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  state.opportunities = allOpportunities.slice(0, 20);
  state.stats.opportunitiesFound += allOpportunities.length;
  state.stats.profitableOpps = allOpportunities.filter(o => o.profitable).length;
  
  // Ejecutar la mejor oportunidad si es rentable
  if (allOpportunities.length > 0 && CONFIG.EXECUTE_REAL && !state.isDryRun) {
    const bestOpp = allOpportunities[0];
    
    // Verificar cooldown
    const now = Date.now();
    if (!state.lastTradeTime || (now - state.lastTradeTime) > CONFIG.COOLDOWN_AFTER_TRADE_MS) {
      if (bestOpp.netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
        log(`\n🎯 MEJOR OPORTUNIDAD: ${bestOpp.strategy} en ${bestOpp.chainName}`, 'opportunity');
        log(`   Route: ${bestOpp.route}`, 'info');
        log(`   Net Profit: $${bestOpp.netProfitUsd.toFixed(4)}`, 'info');
        
        const result = await executeOpportunity(bestOpp);
        if (result) {
          state.lastTradeTime = Date.now();
        }
      }
    }
  }
  
  // Log de estado cada 5 scans
  if (state.stats.totalScans % 5 === 0) {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    log(`📊 Scan #${state.stats.totalScans} | Opps: ${allOpportunities.length} | Trades: ${state.stats.tradesSuccessful}/${state.stats.tradesAttempted} | Net: $${state.stats.netProfitUsd.toFixed(2)} | Uptime: ${uptime}s`, 'stats');
  }
  
  // Log más detallado cada scan
  console.log(`[${new Date().toLocaleTimeString()}] Scan #${state.stats.totalScans} completado - ${allOpportunities.length} oportunidades encontradas`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    trade: '💰',
    opportunity: '🎯',
    stats: '📊'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  state.activityLog.unshift({
    timestamp: Date.now(),
    message,
    type
  });
  
  if (state.activityLog.length > 100) {
    state.activityLog.pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.json({
    status: state.isRunning ? 'running' : 'stopped',
    isDryRun: state.isDryRun,
    uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    uptimeSeconds: uptime,
    currentChain: state.currentChain,
    wallet: WALLET_ADDRESS,
    
    stats: {
      ...state.stats,
      winRate: state.stats.tradesAttempted > 0 
        ? ((state.stats.tradesSuccessful / state.stats.tradesAttempted) * 100).toFixed(2)
        : '0.00',
      scansPerSecond: uptime > 0 ? (state.stats.totalScans / uptime).toFixed(2) : '0.00'
    },
    
    strategies: state.strategies,
    chains: Object.entries(state.chains).map(([key, chain]) => ({
      key,
      ...chain,
      flashLoanContract: FLASH_LOAN_CONTRACTS[key]
    })),
    
    opportunities: state.opportunities.slice(0, 10),
    recentTrades: state.recentTrades.slice(0, 20),
    activityLog: state.activityLog.slice(0, 30),
    
    contracts: {
      flashLoan: FLASH_LOAN_CONTRACTS,
      multiDex: MULTI_DEX_CONTRACTS
    },
    
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, message: 'Bot ya está corriendo' });
  }
  
  const { dryRun = false } = req.body;
  
  state.isRunning = true;
  state.isDryRun = dryRun;
  state.startTime = Date.now();
  
  log(`🚀 Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`, 'success');
  
  // Iniciar loop de escaneo
  const scanLoop = async () => {
    while (state.isRunning) {
      await scanAllChains();
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  };
  
  scanLoop();
  
  res.json({ 
    success: true, 
    message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  log('⏹️ Bot detenido', 'info');
  
  res.json({ 
    success: true, 
    message: 'Bot detenido',
    finalStats: state.stats
  });
});

app.post('/api/defi/multichain-arb/strategy/:strategy/toggle', (req, res) => {
  const { strategy } = req.params;
  if (state.strategies[strategy]) {
    state.strategies[strategy].enabled = !state.strategies[strategy].enabled;
    log(`${strategy} ${state.strategies[strategy].enabled ? 'habilitado' : 'deshabilitado'}`, 'info');
    res.json({ success: true, enabled: state.strategies[strategy].enabled });
  } else {
    res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
  }
});

app.post('/api/defi/multichain-arb/execute', async (req, res) => {
  const { opportunityIndex = 0 } = req.body;
  
  if (state.opportunities.length === 0) {
    return res.json({ success: false, message: 'No hay oportunidades disponibles' });
  }
  
  const opp = state.opportunities[opportunityIndex];
  if (!opp) {
    return res.json({ success: false, message: 'Oportunidad no encontrada' });
  }
  
  const result = await executeOpportunity(opp);
  
  res.json({
    success: result?.status === 'success',
    trade: result
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  await initializeBot();
  
  app.listen(PORT, async () => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ FLASH LOAN ARBITRAGE BOT - API Server`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`📡 API: http://localhost:${PORT}/api/defi/multichain-arb/status`);
    console.log(`🔗 Chains: ${Object.keys(CHAINS).join(', ')}`);
    console.log(`💰 Wallet: ${WALLET_ADDRESS}`);
    console.log(`\n⚡ Flash Loan Contracts:`);
    Object.entries(FLASH_LOAN_CONTRACTS).forEach(([chain, addr]) => {
      console.log(`   ${CHAINS[chain].icon} ${chain}: ${addr}`);
    });
    console.log(`${'═'.repeat(70)}\n`);
    
    // AUTO-START: Iniciar el bot automáticamente en modo LIVE
    console.log('🚀 AUTO-INICIANDO BOT EN MODO LIVE...\n');
    state.isRunning = true;
    state.isDryRun = false;
    state.startTime = Date.now();
    
    log(`🚀 Bot AUTO-INICIADO en modo LIVE`, 'success');
    
    // Iniciar loop de escaneo
    const scanLoop = async () => {
      while (state.isRunning) {
        try {
          await scanAllChains();
        } catch (error) {
          log(`Error en scan loop: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
      }
    };
    
    scanLoop();
  });
}

start().catch(console.error);

