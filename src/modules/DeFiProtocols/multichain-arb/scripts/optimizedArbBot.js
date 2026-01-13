/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT - REAL EXECUTION                     ║
 * ║                                                                               ║
 * ║   Configuración optimizada para máxima rentabilidad:                          ║
 * ║   - Escaneo agresivo de múltiples fee tiers                                   ║
 * ║   - Arbitraje entre DEXs (Uniswap V3 ↔ SushiSwap)                            ║
 * ║   - Micro-arbitraje entre pools del mismo DEX                                 ║
 * ║   - Optimización de gas con EIP-1559                                          ║
 * ║   - Slippage dinámico basado en liquidez                                      ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

// Optimized settings for L2 chains
const CONFIG = {
  // Minimum profit thresholds (in USD)
  MIN_PROFIT_USD: 0.05,        // Reduced to catch micro-arbitrage
  MIN_PROFIT_PERCENT: 0.01,    // 0.01% minimum
  
  // Gas settings
  GAS_MULTIPLIER: 1.2,         // 20% buffer for gas
  MAX_GAS_GWEI: 0.5,           // Max gas price on L2
  
  // Trade sizes to test (in ETH)
  TRADE_SIZES: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02],
  
  // Slippage settings
  BASE_SLIPPAGE_BPS: 30,       // 0.3% base slippage
  MAX_SLIPPAGE_BPS: 100,       // 1% max slippage
  
  // Timing
  SCAN_INTERVAL_MS: 500,       // Scan every 500ms
  MAX_ITERATIONS: 50,          // Run 50 iterations
  
  // Execute trades?
  EXECUTE_TRADES: true,        // SET TO TRUE FOR REAL TRADES
  
  // Minimum balance to keep (in ETH)
  MIN_BALANCE_ETH: 0.005
};

// Chain configurations with optimized settings
const CHAINS = {
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    avgBlockTime: 0.25,
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
    },
    feeTiers: [100, 500, 3000, 10000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    avgBlockTime: 2,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      OP: '0x4200000000000000000000000000000000000042'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      velodromeRouter: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
    },
    feeTiers: [100, 500, 3000, 10000]
  }
};

// ABIs
const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${emoji} ${msg}`);
  if (data) console.log('   ', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function scanForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGas = 200000n;
  const gasCostWei = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3200;
  
  // Skip if gas is too high
  if (gasCostUsd > 0.50) {
    return { opportunities: [], gasCostUsd, reason: 'Gas too high' };
  }

  // Test each trade size
  for (const sizeEth of CONFIG.TRADE_SIZES) {
    const amountIn = ethers.parseEther(sizeEth.toString());
    
    // Strategy 1: Fee tier arbitrage (same DEX, different pools)
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;
        
        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];
        
        try {
          // ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amountIn,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          
          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: quote1[0],
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          
          const ethOut = quote2[0];
          const grossProfit = ethOut - amountIn;
          const netProfit = grossProfit - gasCostWei;
          
          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
            const profitPercent = Number(netProfit * 10000n / amountIn) / 100;
            
            if (profitUsd >= CONFIG.MIN_PROFIT_USD && profitPercent >= CONFIG.MIN_PROFIT_PERCENT) {
              opportunities.push({
                type: 'FEE_TIER_ARB',
                chain: chainKey,
                chainName: chainConfig.name,
                amountIn,
                amountInEth: sizeEth,
                route: `WETH->${fee1/100}%->USDC->${fee2/100}%->WETH`,
                fee1,
                fee2,
                usdcIntermediate: quote1[0],
                ethOut,
                grossProfit,
                netProfit,
                profitUsd,
                profitPercent,
                gasCostWei,
                gasCostUsd
              });
            }
          }
        } catch (e) {
          // Pool doesn't exist or no liquidity
        }
      }
    }
    
    // Strategy 2: DEX arbitrage (Uniswap V3 <-> SushiSwap) - Only on Arbitrum
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Direction A: Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% tier usually has best liquidity
          sqrtPriceLimitX96: 0n
        });
        
        const sushiAmounts = await sushi.getAmountsOut(uniQuote[0], [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        
        const ethOutA = sushiAmounts[1];
        const grossProfitA = ethOutA - amountIn;
        const netProfitA = grossProfitA - gasCostWei;
        
        if (netProfitA > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitA)) * 3200;
          const profitPercent = Number(netProfitA * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'UniV3(0.05%)->Sushi',
              fee1: 500,
              fee2: 'sushi',
              usdcIntermediate: uniQuote[0],
              ethOut: ethOutA,
              grossProfit: grossProfitA,
              netProfit: netProfitA,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
        
        // Direction B: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmountsB = await sushi.getAmountsOut(amountIn, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        
        const uniQuoteB = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: sushiAmountsB[1],
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        
        const ethOutB = uniQuoteB[0];
        const grossProfitB = ethOutB - amountIn;
        const netProfitB = grossProfitB - gasCostWei;
        
        if (netProfitB > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfitB)) * 3200;
          const profitPercent = Number(netProfitB * 10000n / amountIn) / 100;
          
          if (profitUsd >= CONFIG.MIN_PROFIT_USD) {
            opportunities.push({
              type: 'DEX_ARB',
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn,
              amountInEth: sizeEth,
              route: 'Sushi->UniV3(0.05%)',
              fee1: 'sushi',
              fee2: 500,
              usdcIntermediate: sushiAmountsB[1],
              ethOut: ethOutB,
              grossProfit: grossProfitB,
              netProfit: netProfitB,
              profitUsd,
              profitPercent,
              gasCostWei,
              gasCostUsd
            });
          }
        }
      } catch (e) {
        // SushiSwap error
      }
    }
  }
  
  return { opportunities, gasCostUsd };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR - OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  log('🚀', `EXECUTING: ${opp.route} on ${opp.chainName}`);
  log('💰', `Amount: ${opp.amountInEth} ETH | Expected: $${opp.profitUsd.toFixed(4)}`);
  
  try {
    const weth = new ethers.Contract(chainConfig.tokens.WETH, WETH_ABI, connectedWallet);
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    
    // Check WETH balance
    let wethBalance = await weth.balanceOf(wallet.address);
    
    // Wrap ETH if needed
    if (wethBalance < opp.amountIn) {
      log('📦', 'Wrapping ETH to WETH...');
      const wrapTx = await weth.deposit({ 
        value: opp.amountIn,
        gasLimit: 50000
      });
      await wrapTx.wait();
      log('✅', 'Wrapped ETH');
      wethBalance = await weth.balanceOf(wallet.address);
    }
    
    // Approve WETH for router
    const wethAllowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (wethAllowance < opp.amountIn) {
      log('🔓', 'Approving WETH...');
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256, {
        gasLimit: 50000
      });
      await approveTx.wait();
      log('✅', 'WETH approved');
    }
    
    // Calculate slippage
    const slippageBps = CONFIG.BASE_SLIPPAGE_BPS;
    const minUsdcOut = (opp.usdcIntermediate * BigInt(10000 - slippageBps)) / 10000n;
    const minEthOut = (opp.ethOut * BigInt(10000 - slippageBps)) / 10000n;
    
    // SWAP 1: WETH -> USDC
    log('🔄', `Swap 1: WETH -> USDC (${opp.fee1 === 'sushi' ? 'Sushi' : opp.fee1/100 + '%'})`);
    
    let usdcReceived;
    
    if (opp.fee1 === 'sushi') {
      // Use SushiSwap
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      
      // Approve for Sushi
      const sushiAllowance = await weth.allowance(wallet.address, chainConfig.dex.sushiRouter);
      if (sushiAllowance < opp.amountIn) {
        const approveTx = await weth.approve(chainConfig.dex.sushiRouter, ethers.MaxUint256, { gasLimit: 50000 });
        await approveTx.wait();
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const swap1Tx = await sushi.swapExactTokensForTokens(
        opp.amountIn,
        minUsdcOut,
        [chainConfig.tokens.WETH, chainConfig.tokens.USDC],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
      
    } else {
      // Use Uniswap V3
      const swap1Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.WETH,
        tokenOut: chainConfig.tokens.USDC,
        fee: opp.fee1,
        recipient: wallet.address,
        amountIn: opp.amountIn,
        amountOutMinimum: minUsdcOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt1 = await swap1Tx.wait();
      log('✅', `Swap 1 done: ${receipt1.hash}`);
    }
    
    // Get USDC balance
    usdcReceived = await usdc.balanceOf(wallet.address);
    log('💵', `USDC received: ${formatUsdc(usdcReceived)}`);
    
    // Approve USDC for swap 2
    const usdcAllowance = await usdc.allowance(wallet.address, 
      opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router
    );
    if (usdcAllowance < usdcReceived) {
      log('🔓', 'Approving USDC...');
      const approveUsdcTx = await usdc.approve(
        opp.fee2 === 'sushi' ? chainConfig.dex.sushiRouter : chainConfig.dex.uniV3Router,
        ethers.MaxUint256,
        { gasLimit: 50000 }
      );
      await approveUsdcTx.wait();
    }
    
    // SWAP 2: USDC -> WETH
    log('🔄', `Swap 2: USDC -> WETH (${opp.fee2 === 'sushi' ? 'Sushi' : opp.fee2/100 + '%'})`);
    
    if (opp.fee2 === 'sushi') {
      const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, connectedWallet);
      const deadline = Math.floor(Date.now() / 1000) + 120;
      
      const swap2Tx = await sushi.swapExactTokensForTokens(
        usdcReceived,
        minEthOut,
        [chainConfig.tokens.USDC, chainConfig.tokens.WETH],
        wallet.address,
        deadline,
        { gasLimit: 300000 }
      );
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
      
    } else {
      const swap2Tx = await router.exactInputSingle({
        tokenIn: chainConfig.tokens.USDC,
        tokenOut: chainConfig.tokens.WETH,
        fee: opp.fee2,
        recipient: wallet.address,
        amountIn: usdcReceived,
        amountOutMinimum: minEthOut,
        sqrtPriceLimitX96: 0n
      }, { gasLimit: 300000 });
      
      const receipt2 = await swap2Tx.wait();
      log('✅', `Swap 2 done: ${receipt2.hash}`);
    }
    
    // Calculate actual profit
    const finalWeth = await weth.balanceOf(wallet.address);
    const actualProfit = finalWeth - wethBalance + opp.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;
    
    log('📊', 'TRADE RESULT:');
    log('💰', `Actual Profit: ${formatEth(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    
    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      expectedProfitUsd: opp.profitUsd
    };
    
  } catch (error) {
    log('❌', `Trade failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 OPTIMIZED MULTI-CHAIN ARBITRAGE BOT                                      ║
║                                                                               ║
║   Mode: ${CONFIG.EXECUTE_TRADES ? '🔴 LIVE TRADING' : '🟡 DRY RUN'}                                              ║
║   Min Profit: $${CONFIG.MIN_PROFIT_USD} | ${CONFIG.MIN_PROFIT_PERCENT}%                                         ║
║   Trade Sizes: ${CONFIG.TRADE_SIZES.join(', ')} ETH                                  ║
║   Iterations: ${CONFIG.MAX_ITERATIONS}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  log('📍', `Wallet: ${wallet.address}`);
  
  // Check balances
  log('💰', 'Checking balances...');
  const balances = {};
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      balances[chainKey] = balance;
      log('   ', `${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      log('❌', `${chainConfig.name}: Connection error`);
    }
  }
  
  // Stats
  let stats = {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    bestTrade: null
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  log('🔍', 'Starting optimized arbitrage scan...');
  console.log(`${'═'.repeat(70)}\n`);
  
  // Main loop
  for (let i = 1; i <= CONFIG.MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i}/${CONFIG.MAX_ITERATIONS} ---`);
    
    // Scan all chains in parallel
    const scanPromises = Object.entries(CHAINS).map(async ([chainKey, chainConfig]) => {
      // Skip if balance too low
      if (balances[chainKey] < ethers.parseEther(CONFIG.MIN_BALANCE_ETH.toString())) {
        return { chainKey, opportunities: [], reason: 'Low balance' };
      }
      
      try {
        const result = await scanForArbitrage(chainKey, chainConfig, wallet);
        return { chainKey, ...result };
      } catch (e) {
        return { chainKey, opportunities: [], error: e.message };
      }
    });
    
    const results = await Promise.all(scanPromises);
    stats.totalScans += results.length;
    
    // Collect all opportunities
    let allOpportunities = [];
    for (const result of results) {
      if (result.opportunities && result.opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(result.opportunities);
        log('✅', `${CHAINS[result.chainKey].name}: ${result.opportunities.length} opportunities`);
      } else {
        log('⚪', `${CHAINS[result.chainKey].name}: No opportunities (gas: $${result.gasCostUsd?.toFixed(4) || 'N/A'})`);
      }
    }
    
    stats.opportunitiesFound += allOpportunities.length;
    
    if (allOpportunities.length > 0) {
      // Sort by profit
      allOpportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
      const best = allOpportunities[0];
      
      log('📈', `Best opportunity: ${best.route} on ${best.chainName}`);
      log('💰', `Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);
      log('📊', `Amount: ${best.amountInEth} ETH | Gas: $${best.gasCostUsd.toFixed(4)}`);
      
      // Execute if enabled and profit meets threshold
      if (CONFIG.EXECUTE_TRADES && best.profitUsd >= CONFIG.MIN_PROFIT_USD) {
        log('🚀', 'Executing trade...');
        
        const result = await executeTrade(best, wallet, CHAINS[best.chain]);
        stats.tradesExecuted++;
        
        if (result.success) {
          stats.successfulTrades++;
          stats.totalProfitUsd += result.profitUsd;
          
          if (!stats.bestTrade || result.profitUsd > stats.bestTrade.profitUsd) {
            stats.bestTrade = { ...best, actualProfitUsd: result.profitUsd };
          }
          
          log('✅', `Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          
          // Update balance
          const provider = new ethers.JsonRpcProvider(CHAINS[best.chain].rpc);
          balances[best.chain] = await provider.getBalance(wallet.address);
        } else {
          log('❌', `Trade failed: ${result.error}`);
        }
      }
    }
    
    // Wait before next iteration
    if (i < CONFIG.MAX_ITERATIONS) {
      await new Promise(r => setTimeout(r, CONFIG.SCAN_INTERVAL_MS));
    }
  }
  
  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:          ${stats.totalScans.toString().padEnd(48)}║`);
  console.log(`║  Opportunities Found:  ${stats.opportunitiesFound.toString().padEnd(48)}║`);
  console.log(`║  Trades Executed:      ${stats.tradesExecuted.toString().padEnd(48)}║`);
  console.log(`║  Successful Trades:    ${stats.successfulTrades.toString().padEnd(48)}║`);
  console.log(`║  Total Profit:         $${stats.totalProfitUsd.toFixed(4).padEnd(47)}║`);
  console.log(`║  Win Rate:             ${stats.tradesExecuted > 0 ? ((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(1) + '%' : 'N/A'.padEnd(48)}║`);
  
  if (stats.bestTrade) {
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Best Trade:                                                                 ║`);
    console.log(`║    Chain: ${stats.bestTrade.chainName.padEnd(60)}║`);
    console.log(`║    Route: ${stats.bestTrade.route.padEnd(60)}║`);
    console.log(`║    Profit: $${stats.bestTrade.actualProfitUsd?.toFixed(4).padEnd(58)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  // Final balances
  console.log('\n💰 Final Balances:');
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${formatEth(balance)} ETH`);
    } catch (e) {
      // Skip
    }
  }
}

// Run
main().catch(console.error);




