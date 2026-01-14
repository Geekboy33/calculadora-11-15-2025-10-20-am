/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

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
 * 💰 BOT ARBITRAJE CON SMART CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot que usa los contratos MultiDexExecutor desplegados para ejecutar
 * arbitraje atómico entre múltiples DEXs.
 * 
 * Contratos desplegados:
 * - Base: 0xEFC1c69D56c38FADcEf13C83CC0B57853593C496
 * - Arbitrum: 0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911
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
  SCAN_INTERVAL_MS: 3000,
  MIN_PROFIT_USD: 0.05,         // Mínimo $0.05 profit
  MIN_PROFIT_BPS: 5,            // Mínimo 0.05% spread
  MAX_SLIPPAGE_BPS: 50,         // 0.5% slippage
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003],
  USE_CONTRACT: true            // Usar contratos desplegados
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATOS DESPLEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPLOYED_CONTRACTS = {
  base: {
    MultiDexExecutor: '0xEFC1c69D56c38FADcEf13C83CC0B57853593C496'
  },
  arbitrum: {
    MultiDexExecutor: '0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911'
  }
};

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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [100, 500, 3000, 10000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [100, 500, 3000, 10000]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════════════════════

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const MULTI_DEX_EXECUTOR_ABI = [
  'function owner() view returns (address)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function totalTrades() view returns (uint256)',
  'function successfulTrades() view returns (uint256)',
  'function totalProfitWei() view returns (uint256)',
  'function getStats() view returns (uint256 totalTrades, uint256 successfulTrades, uint256 totalProfitWei)',
  'function getBalances() view returns (uint256 ethBalance, uint256 wethBalance, uint256 usdcBalance)',
  'function executeIntraDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2, uint256 minProfit) external returns (uint256 profit)',
  'function executeCrossDexArbitrage(address tokenA, address tokenB, uint256 amountIn, uint8 buyDex, uint8 sellDex, uint24 uniFee, uint256 minProfit) external returns (uint256 profit)',
  'function executeTriangularArbitrage(address tokenA, address tokenB, address tokenC, uint256 amountIn, uint24 feeAB, uint24 feeBC, uint24 feeCA, uint256 minProfit) external returns (uint256 profit)',
  'function simulateArbitrage(address tokenA, address tokenB, uint256 amountIn, uint24 fee1, uint24 fee2) external returns (int256 expectedProfit)',
  'function withdrawToken(address token) external',
  'function withdrawETH() external'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
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
    contractStats: {}
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: [
    { name: 'intraDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'crossDex', enabled: true, scans: 0, opportunities: 0, executions: 0 },
    { name: 'triangular', enabled: true, scans: 0, opportunities: 0, executions: 0 },
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
    'ERROR': '❌', 'WARN': '⚠️', 'PROFIT': '💰', 'CONTRACT': '📜'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  log('Inicializando conexiones y contratos...', 'INFO');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Inicializar contratos
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      // Cargar contrato MultiDexExecutor si está desplegado
      if (DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor) {
        contracts[chainKey].multiDex = new ethers.Contract(
          DEPLOYED_CONTRACTS[chainKey].MultiDexExecutor,
          MULTI_DEX_EXECUTOR_ABI,
          signers[chainKey]
        );
        
        // Verificar owner
        const owner = await contracts[chainKey].multiDex.owner();
        log(`${chain.name}: Contrato MultiDex verificado (owner: ${owner.slice(0, 10)}...)`, 'CONTRACT');
      }
      
      // SushiSwap en Arbitrum
      if (chain.sushiRouter) {
        contracts[chainKey].sushiRouter = new ethers.Contract(
          chain.sushiRouter, SUSHI_ROUTER_ABI, provider
        );
      }
      
      // Obtener balance
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      // Precio ETH
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
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        ethPrice,
        isActive: balanceEth > 0.001,
        explorer: chain.explorer,
        connected: true,
        hasContract: !!DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor,
        contractAddress: DEPLOYED_CONTRACTS[chainKey]?.MultiDexExecutor || null,
        protocols: ['Uniswap V3', chain.sushiRouter ? 'SushiSwap' : null].filter(Boolean)
      });
      
      state.banditStates.push({
        chain: chainKey, alpha: 2, beta: 2, winRate: 50,
        selected: chainKey === 'base', attempts: 0, wins: 0
      });
      
      log(`${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`, 'SUCCESS');
      
    } catch (e) {
      log(`${chain.name}: Error - ${e.message.slice(0, 50)}`, 'ERROR');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  if (!providers[chainKey]) return [];
  
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 500000n; // Estimación conservadora
    
    const chainState = state.chains.find(c => c.chain === chainKey);
    const ethPrice = chainState?.ethPrice || 3500;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Intra-DEX (diferentes fee tiers)
    // ═══════════════════════════════════════════════════════════════════════════
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < chain.fees.length; i++) {
        for (let j = 0; j < chain.fees.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: chain.fees[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: chain.fees[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfitWei = wethOut - amountWei;
            const netProfitWei = grossProfitWei - gasCostWei;
            const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
            const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
            
            if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
              opportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'INTRA_DEX',
                route: `WETH→USDC(${chain.fees[i]/100}%)→WETH(${chain.fees[j]/100}%)`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: chain.fees[i],
                fee2: chain.fees[j],
                tokenA: chain.tokens.WETH,
                tokenB: chain.tokens.USDC,
                spreadBps,
                grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
                gasCostUsd,
                netProfitUsd,
                ethPrice,
                profitable: true,
                timestamp: Date.now()
              });
              
              log(`💎 INTRA-DEX: ${chain.name} | ${chain.fees[i]/100}%→${chain.fees[j]/100}% | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
            }
          } catch (e) {}
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 2: Cross-DEX (Uniswap vs SushiSwap) - Solo Arbitrum
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (chainKey === 'arbitrum' && contracts[chainKey].sushiRouter) {
        try {
          // Quote Uniswap: WETH → USDC
          const uniQuote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.WETH,
            tokenOut: chain.tokens.USDC,
            amountIn: amountWei,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniUsdcOut = uniQuote[0];
          
          // Quote Sushi: USDC → WETH
          const sushiPath = [chain.tokens.USDC, chain.tokens.WETH];
          const sushiAmounts = await contracts[chainKey].sushiRouter.getAmountsOut(uniUsdcOut, sushiPath);
          const sushiWethOut = sushiAmounts[1];
          
          const grossProfitWei = sushiWethOut - amountWei;
          const netProfitWei = grossProfitWei - gasCostWei;
          const netProfitUsd = parseFloat(ethers.formatEther(netProfitWei)) * ethPrice;
          const spreadBps = Number((grossProfitWei * 10000n) / amountWei);
          
          if (netProfitUsd >= CONFIG.MIN_PROFIT_USD && spreadBps >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Uni(WETH→USDC)→Sushi(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 0, // Uniswap
              sellDex: 1, // Sushi
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Uni→Sushi | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
          }
          
          // También probar al revés: Sushi → Uni
          const sushiPath2 = [chain.tokens.WETH, chain.tokens.USDC];
          const sushiAmounts2 = await contracts[chainKey].sushiRouter.getAmountsOut(amountWei, sushiPath2);
          const sushiUsdcOut = sushiAmounts2[1];
          
          const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chain.tokens.USDC,
            tokenOut: chain.tokens.WETH,
            amountIn: sushiUsdcOut,
            fee: 500,
            sqrtPriceLimitX96: 0n
          });
          const uniWethOut = uniQuote2[0];
          
          const grossProfitWei2 = uniWethOut - amountWei;
          const netProfitWei2 = grossProfitWei2 - gasCostWei;
          const netProfitUsd2 = parseFloat(ethers.formatEther(netProfitWei2)) * ethPrice;
          const spreadBps2 = Number((grossProfitWei2 * 10000n) / amountWei);
          
          if (netProfitUsd2 >= CONFIG.MIN_PROFIT_USD && spreadBps2 >= CONFIG.MIN_PROFIT_BPS) {
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'CROSS_DEX',
              route: 'Sushi(WETH→USDC)→Uni(USDC→WETH)',
              amountInEth: amountEth,
              amountIn: amountWei,
              buyDex: 1, // Sushi
              sellDex: 0, // Uniswap
              uniFee: 500,
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              spreadBps: spreadBps2,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei2)) * ethPrice,
              gasCostUsd,
              netProfitUsd: netProfitUsd2,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 CROSS-DEX: ${chain.name} | Sushi→Uni | +$${netProfitUsd2.toFixed(4)}`, 'PROFIT');
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTRATEGIA 3: Triangular (WETH → USDC → DAI → WETH)
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
          const triGasCost = gasCostWei * 3n / 2n;
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
              tokenA: chain.tokens.WETH,
              tokenB: chain.tokens.USDC,
              tokenC: chain.tokens.DAI,
              feeAB: 500,
              feeBC: 100,
              feeCA: 3000,
              spreadBps,
              grossProfitUsd: parseFloat(ethers.formatEther(grossProfitWei)) * ethPrice,
              gasCostUsd: parseFloat(ethers.formatEther(triGasCost)) * ethPrice,
              netProfitUsd,
              ethPrice,
              profitable: true,
              timestamp: Date.now()
            });
            
            log(`💎 TRIANGULAR: ${chain.name} | WETH→USDC→DAI→WETH | +$${netProfitUsd.toFixed(4)}`, 'PROFIT');
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
// EJECUTAR TRADE VÍA CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

async function executeViaContract(opp) {
  if (isExecuting) return null;
  if (opp.netProfitUsd < CONFIG.MIN_PROFIT_USD) return null;
  
  isExecuting = true;
  const startTime = Date.now();
  
  const chain = CHAINS[opp.chain];
  const multiDex = contracts[opp.chain].multiDex;
  const weth = contracts[opp.chain].weth;
  const provider = providers[opp.chain];
  
  if (!multiDex) {
    log(`No hay contrato MultiDex en ${chain.name}`, 'WARN');
    isExecuting = false;
    return null;
  }
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`EJECUTANDO VÍA CONTRATO en ${chain.name}`, 'CONTRACT');
  log(`Estrategia: ${opp.strategy}`, 'EXEC');
  log(`Ruta: ${opp.route}`, 'EXEC');
  log(`Profit esperado: +$${opp.netProfitUsd.toFixed(4)}`, 'PROFIT');
  
  try {
    // Primero, enviar WETH al contrato
    log('Enviando WETH al contrato...', 'INFO');
    
    // Wrap ETH si es necesario
    const wethBalance = await weth.balanceOf(WALLET_ADDRESS);
    if (wethBalance < opp.amountIn) {
      const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 60000 });
      await wrapTx.wait(1);
      log('ETH wrapped', 'SUCCESS');
    }
    
    // Transferir WETH al contrato
    const contractAddress = await multiDex.getAddress();
    const transferTx = await weth.transfer(contractAddress, opp.amountIn, { gasLimit: 60000 });
    await transferTx.wait(1);
    log(`WETH transferido al contrato`, 'SUCCESS');
    
    let receipt;
    let profit = 0n;
    
    if (opp.strategy === 'INTRA_DEX') {
      log('Ejecutando Intra-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeIntraDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.fee1,
        opp.fee2,
        0, // minProfit = 0, ya validamos antes
        { gasLimit: 800000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'CROSS_DEX') {
      log('Ejecutando Cross-DEX Arbitrage...', 'EXEC');
      const tx = await multiDex.executeCrossDexArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.amountIn,
        opp.buyDex,
        opp.sellDex,
        opp.uniFee,
        0,
        { gasLimit: 1000000 }
      );
      receipt = await tx.wait(1);
      
    } else if (opp.strategy === 'TRIANGULAR') {
      log('Ejecutando Triangular Arbitrage...', 'EXEC');
      const tx = await multiDex.executeTriangularArbitrage(
        opp.tokenA,
        opp.tokenB,
        opp.tokenC,
        opp.amountIn,
        opp.feeAB,
        opp.feeBC,
        opp.feeCA,
        0,
        { gasLimit: 1200000 }
      );
      receipt = await tx.wait(1);
    }
    
    // Obtener stats del contrato
    const [totalTrades, successfulTrades, totalProfitWei] = await multiDex.getStats();
    
    // Retirar profit del contrato
    log('Retirando profit del contrato...', 'INFO');
    const withdrawTx = await multiDex.withdrawToken(opp.tokenA, { gasLimit: 100000 });
    await withdrawTx.wait(1);
    
    const executionTime = Date.now() - startTime;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCost)) * opp.ethPrice;
    
    log(`════════════════════════════════════════════════════════════`, 'SUCCESS');
    log(`TRADE COMPLETADO VÍA CONTRATO!`, 'SUCCESS');
    log(`Gas usado: ${receipt.gasUsed.toString()}`, 'INFO');
    log(`Costo gas: $${gasCostUsd.toFixed(4)}`, 'INFO');
    log(`Tiempo: ${executionTime}ms`, 'INFO');
    log(`TX: ${chain.explorer}/tx/${receipt.hash}`, 'INFO');
    log(`Contrato stats: ${totalTrades.toString()} trades, ${successfulTrades.toString()} exitosos`, 'CONTRACT');
    
    isExecuting = false;
    
    return {
      success: true,
      profitUsd: opp.netProfitUsd - gasCostUsd,
      gasCostUsd,
      txHash: receipt.hash,
      executionTimeMs: executionTime,
      contractStats: { totalTrades, successfulTrades, totalProfitWei }
    };
    
  } catch (e) {
    log(`ERROR: ${e.message}`, 'ERROR');
    
    // Intentar recuperar WETH del contrato
    try {
      const withdrawTx = await multiDex.withdrawToken(chain.tokens.WETH, { gasLimit: 100000 });
      await withdrawTx.wait(1);
      log('WETH recuperado del contrato', 'WARN');
    } catch (e2) {}
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
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
  
  // Escanear
  const opportunities = await scanOpportunities(selectedChain);
  
  if (opportunities.length > 0) {
    state.stats.profitableOpportunities += opportunities.length;
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
    
    state.opportunities = opportunities.map(o => ({
      ...o,
      amountIn: o.amountIn?.toString()
    }));
    
    const best = opportunities[0];
    
    log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | ${opportunities.length} opps | Best: +$${best.netProfitUsd.toFixed(4)}`, 'SCAN');
    
    // Ejecutar si NO es dry run
    if (!state.isDryRun && CONFIG.USE_CONTRACT) {
      state.stats.tradesAttempted++;
      const result = await executeViaContract(best);
      
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
          actualProfit: result.profitUsd?.toFixed(4) || '0',
          gasCost: result.gasCostUsd?.toFixed(4) || '0',
          netProfit: result.profitUsd?.toFixed(4) || '0',
          txHash: result.txHash || '',
          status: result.success ? 'success' : 'failed',
          error: result.error || '',
          executionTimeMs: result.executionTimeMs || 0,
          viaContract: true
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
          
        state.stats.contractStats = result.contractStats || {};
      }
    }
  } else {
    if (state.stats.totalScans % 10 === 0) {
      log(`Scan #${state.stats.totalScans} | ${CHAINS[selectedChain].name} | Sin oportunidades rentables`, 'SCAN');
    }
  }
  
  // Actualizar balances
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
    contractStats: {}
  };
  state.tradeLogs = [];
  
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  log(`BOT CON CONTRATOS INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`, 'EXEC');
  log(`Contratos desplegados:`, 'CONTRACT');
  log(`  Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}`, 'CONTRACT');
  log(`  Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}`, 'CONTRACT');
  log(`════════════════════════════════════════════════════════════`, 'EXEC');
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  setTimeout(tick, 500);
  
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun, contracts: DEPLOYED_CONTRACTS });
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

app.get('/api/defi/multichain-arb/contracts', (req, res) => {
  res.json({
    contracts: DEPLOYED_CONTRACTS,
    chains: state.chains.map(c => ({
      chain: c.chain,
      name: c.name,
      hasContract: c.hasContract,
      contractAddress: c.contractAddress
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   💰 BOT ARBITRAJE CON SMART CONTRACTS
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS}
   
   📜 Contratos Desplegados:
   • Base: ${DEPLOYED_CONTRACTS.base.MultiDexExecutor}
   • Arbitrum: ${DEPLOYED_CONTRACTS.arbitrum.MultiDexExecutor}
   
   ⚡ Estrategias:
   • Intra-DEX (diferentes fee tiers)
   • Cross-DEX (Uniswap ↔ SushiSwap)
   • Triangular (WETH → USDC → DAI → WETH)
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD}

═══════════════════════════════════════════════════════════════════════════════
  `);
  
  await init();
  log('Bot listo. POST /api/defi/multichain-arb/start para iniciar', 'INFO');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});





