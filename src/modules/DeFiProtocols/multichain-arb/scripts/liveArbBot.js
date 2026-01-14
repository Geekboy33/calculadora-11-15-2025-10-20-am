/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);



 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);


 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
 * ║                                                                               ║
 * ║   Ejecuta arbitraje real entre DEXs en múltiples chains L2                    ║
 * ║   - Base, Arbitrum, Optimism                                                  ║
 * ║   - Uniswap V3 + SushiSwap                                                    ║
 * ║   - AI-powered chain rotation (Thompson Sampling)                             ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: Private key not found in .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    dex: {
      uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    feeTiers: [100, 500, 3000]
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
      sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    },
    feeTiers: [100, 500, 3000]
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    dex: {
      uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
    },
    feeTiers: [100, 500, 3000]
  }
};

// ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING (AI Chain Selection)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampling {
  constructor(chains) {
    this.arms = {};
    for (const chain of chains) {
      this.arms[chain] = { alpha: 1, beta: 1, successes: 0, failures: 0 };
    }
  }

  selectChain() {
    let bestChain = null;
    let bestSample = -1;

    for (const [chain, arm] of Object.entries(this.arms)) {
      // Sample from Beta distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestChain = chain;
      }
    }

    return bestChain;
  }

  updateReward(chain, success) {
    if (success) {
      this.arms[chain].alpha += 1;
      this.arms[chain].successes += 1;
    } else {
      this.arms[chain].beta += 1;
      this.arms[chain].failures += 1;
    }
  }

  sampleBeta(alpha, beta) {
    // Approximation of Beta distribution sampling
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  sampleGamma(shape, scale) {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getStats() {
    const stats = {};
    for (const [chain, arm] of Object.entries(this.arms)) {
      stats[chain] = {
        winRate: arm.successes / (arm.successes + arm.failures) || 0,
        successes: arm.successes,
        failures: arm.failures,
        expectedValue: arm.alpha / (arm.alpha + arm.beta)
      };
    }
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARBITRAGE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChainForArbitrage(chainKey, chainConfig, wallet) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const quoter = new ethers.Contract(chainConfig.dex.uniV3Quoter, QUOTER_V2_ABI, provider);
  
  const opportunities = [];
  const testAmounts = [
    ethers.parseEther('0.005'),
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02')
  ];

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
  const estimatedGasUnits = 250000n;
  const gasCostWei = gasPrice * estimatedGasUnits;

  for (const amount of testAmounts) {
    // Scan different fee tier combinations for arbitrage
    for (let i = 0; i < chainConfig.feeTiers.length; i++) {
      for (let j = 0; j < chainConfig.feeTiers.length; j++) {
        if (i === j) continue;

        const fee1 = chainConfig.feeTiers[i];
        const fee2 = chainConfig.feeTiers[j];

        try {
          // Route: ETH -> USDC (fee1) -> ETH (fee2)
          const quote1 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.WETH,
            tokenOut: chainConfig.tokens.USDC,
            amountIn: amount,
            fee: fee1,
            sqrtPriceLimitX96: 0n
          });
          const usdcOut = quote1[0];

          const quote2 = await quoter.quoteExactInputSingle.staticCall({
            tokenIn: chainConfig.tokens.USDC,
            tokenOut: chainConfig.tokens.WETH,
            amountIn: usdcOut,
            fee: fee2,
            sqrtPriceLimitX96: 0n
          });
          const ethOut = quote2[0];

          const grossProfit = ethOut - amount;
          const netProfit = grossProfit - gasCostWei;

          if (netProfit > 0n) {
            const profitUsd = Number(ethers.formatEther(netProfit)) * 3200; // Approximate ETH price
            opportunities.push({
              chain: chainKey,
              chainName: chainConfig.name,
              amountIn: amount,
              amountInEth: ethers.formatEther(amount),
              route: `ETH->${fee1/100}%->USDC->${fee2/100}%->ETH`,
              fee1,
              fee2,
              usdcIntermediate: usdcOut,
              ethOut,
              grossProfit,
              netProfit,
              profitUsd,
              gasCost: gasCostWei,
              profitPercent: Number(netProfit * 10000n / amount) / 100
            });
          }
        } catch (e) {
          // Pool might not exist for this fee tier combination
        }
      }
    }

    // If chain has SushiSwap, scan Uni<->Sushi arbitrage
    if (chainConfig.dex.sushiRouter) {
      try {
        const sushi = new ethers.Contract(chainConfig.dex.sushiRouter, SUSHI_ROUTER_ABI, provider);
        
        // Uni ETH->USDC, Sushi USDC->ETH
        const uniQuote = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: amount,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const usdcFromUni = uniQuote[0];

        const sushiAmounts = await sushi.getAmountsOut(usdcFromUni, [
          chainConfig.tokens.USDC,
          chainConfig.tokens.WETH
        ]);
        const ethFromSushi = sushiAmounts[1];

        const grossProfit = ethFromSushi - amount;
        const netProfit = grossProfit - gasCostWei;

        if (netProfit > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'UniV3->Sushi',
            fee1: 500,
            fee2: 'sushi',
            usdcIntermediate: usdcFromUni,
            ethOut: ethFromSushi,
            grossProfit,
            netProfit,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit * 10000n / amount) / 100
          });
        }

        // Reverse: Sushi ETH->USDC, Uni USDC->ETH
        const sushiAmounts2 = await sushi.getAmountsOut(amount, [
          chainConfig.tokens.WETH,
          chainConfig.tokens.USDC
        ]);
        const usdcFromSushi = sushiAmounts2[1];

        const uniQuote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.USDC,
          tokenOut: chainConfig.tokens.WETH,
          amountIn: usdcFromSushi,
          fee: 500,
          sqrtPriceLimitX96: 0n
        });
        const ethFromUni = uniQuote2[0];

        const grossProfit2 = ethFromUni - amount;
        const netProfit2 = grossProfit2 - gasCostWei;

        if (netProfit2 > 0n) {
          const profitUsd = Number(ethers.formatEther(netProfit2)) * 3200;
          opportunities.push({
            chain: chainKey,
            chainName: chainConfig.name,
            amountIn: amount,
            amountInEth: ethers.formatEther(amount),
            route: 'Sushi->UniV3',
            fee1: 'sushi',
            fee2: 500,
            usdcIntermediate: usdcFromSushi,
            ethOut: ethFromUni,
            grossProfit: grossProfit2,
            netProfit: netProfit2,
            profitUsd,
            gasCost: gasCostWei,
            profitPercent: Number(netProfit2 * 10000n / amount) / 100
          });
        }
      } catch (e) {
        // SushiSwap might not have liquidity
      }
    }
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function executeArbitrage(opportunity, wallet, chainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  console.log(`\n   🚀 EXECUTING TRADE on ${opportunity.chainName}`);
  console.log(`      Route: ${opportunity.route}`);
  console.log(`      Amount: ${opportunity.amountInEth} ETH`);
  console.log(`      Expected Profit: $${opportunity.profitUsd.toFixed(4)}`);

  try {
    // Step 1: Wrap ETH to WETH if needed
    const weth = new ethers.Contract(
      chainConfig.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      connectedWallet
    );

    // Check WETH balance
    const wethBalance = await weth.balanceOf(wallet.address);
    if (wethBalance < opportunity.amountIn) {
      console.log(`      📦 Wrapping ETH to WETH...`);
      const wrapTx = await weth.deposit({ value: opportunity.amountIn });
      await wrapTx.wait();
      console.log(`      ✅ Wrapped ${opportunity.amountInEth} ETH`);
    }

    // Step 2: Approve router for WETH
    const router = new ethers.Contract(chainConfig.dex.uniV3Router, SWAP_ROUTER_ABI, connectedWallet);
    const allowance = await weth.allowance(wallet.address, chainConfig.dex.uniV3Router);
    
    if (allowance < opportunity.amountIn) {
      console.log(`      🔓 Approving WETH...`);
      const approveTx = await weth.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`      ✅ Approved`);
    }

    // Step 3: Execute first swap (WETH -> USDC)
    console.log(`      🔄 Swap 1: WETH -> USDC...`);
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage

    const swap1Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      fee: typeof opportunity.fee1 === 'number' ? opportunity.fee1 : 500,
      recipient: wallet.address,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    
    const swap1Receipt = await swap1Tx.wait();
    console.log(`      ✅ Swap 1 complete: ${swap1Receipt.hash}`);

    // Step 4: Approve USDC for second swap
    const usdc = new ethers.Contract(chainConfig.tokens.USDC, ERC20_ABI, connectedWallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`      💵 USDC received: ${ethers.formatUnits(usdcBalance, 6)}`);

    const usdcAllowance = await usdc.allowance(wallet.address, chainConfig.dex.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`      🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chainConfig.dex.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // Step 5: Execute second swap (USDC -> WETH)
    console.log(`      🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage

    const swap2Tx = await router.exactInputSingle({
      tokenIn: chainConfig.tokens.USDC,
      tokenOut: chainConfig.tokens.WETH,
      fee: typeof opportunity.fee2 === 'number' ? opportunity.fee2 : 500,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });

    const swap2Receipt = await swap2Tx.wait();
    console.log(`      ✅ Swap 2 complete: ${swap2Receipt.hash}`);

    // Step 6: Check final WETH balance
    const finalWethBalance = await weth.balanceOf(wallet.address);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = Number(ethers.formatEther(actualProfit)) * 3200;

    console.log(`\n   📊 TRADE RESULT:`);
    console.log(`      Initial: ${opportunity.amountInEth} ETH`);
    console.log(`      Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`      Profit: ${ethers.formatEther(actualProfit)} ETH (~$${actualProfitUsd.toFixed(4)})`);
    console.log(`      TX: ${chainConfig.explorer}${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (error) {
    console.log(`      ❌ Trade failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BOT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN LIVE ARBITRAGE BOT                                           ║
║                                                                               ║
║   Mode: LIVE (Real Trades)                                                    ║
║   Chains: Base, Arbitrum, Optimism                                            ║
║   AI: Thompson Sampling for chain selection                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Check balances on all chains
  console.log(`\n💰 Checking balances...`);
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${chainConfig.name}: ${ethers.formatEther(balance)} ETH`);
    } catch (e) {
      console.log(`   ${chainConfig.name}: Error connecting`);
    }
  }

  // Initialize AI
  const ai = new ThompsonSampling(Object.keys(CHAINS));
  
  // Stats
  let totalScans = 0;
  let totalTrades = 0;
  let totalProfitUsd = 0;
  let successfulTrades = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 Starting arbitrage scan loop...`);
  console.log(`${'═'.repeat(70)}\n`);

  // Main loop - run for 5 iterations for testing
  const maxIterations = 5;
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);
    
    // AI selects best chain to scan
    const selectedChain = ai.selectChain();
    const chainConfig = CHAINS[selectedChain];
    
    console.log(`   🧠 AI selected: ${chainConfig.name}`);
    
    try {
      // Scan for opportunities
      console.log(`   🔍 Scanning for arbitrage...`);
      const opportunities = await scanChainForArbitrage(selectedChain, chainConfig, wallet);
      totalScans++;

      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
        const best = opportunities[0];
        
        console.log(`   ✅ Found ${opportunities.length} opportunities!`);
        console.log(`   📈 Best: ${best.route} | Profit: $${best.profitUsd.toFixed(4)} (${best.profitPercent.toFixed(3)}%)`);

        // Execute if profit > $0.10
        if (best.profitUsd > 0.10) {
          console.log(`   💰 Profit threshold met, executing trade...`);
          
          const result = await executeArbitrage(best, wallet, chainConfig);
          totalTrades++;
          
          if (result.success) {
            successfulTrades++;
            totalProfitUsd += result.profitUsd;
            ai.updateReward(selectedChain, true);
            console.log(`   ✅ Trade successful! Profit: $${result.profitUsd.toFixed(4)}`);
          } else {
            ai.updateReward(selectedChain, false);
            console.log(`   ❌ Trade failed`);
          }
        } else {
          console.log(`   ⚠️ Profit too low ($${best.profitUsd.toFixed(4)}), skipping...`);
          ai.updateReward(selectedChain, false);
        }
      } else {
        console.log(`   ⚪ No profitable opportunities found`);
        ai.updateReward(selectedChain, false);
      }

    } catch (error) {
      console.log(`   ❌ Scan error: ${error.message}`);
      ai.updateReward(selectedChain, false);
    }

    // Wait before next iteration
    if (iteration < maxIterations) {
      console.log(`   ⏳ Waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Print final stats
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 SESSION SUMMARY                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Scans:        ${totalScans.toString().padEnd(50)}║`);
  console.log(`║  Total Trades:       ${totalTrades.toString().padEnd(50)}║`);
  console.log(`║  Successful Trades:  ${successfulTrades.toString().padEnd(50)}║`);
  console.log(`║  Total Profit:       $${totalProfitUsd.toFixed(4).padEnd(48)}║`);
  console.log(`║  Win Rate:           ${totalTrades > 0 ? ((successfulTrades/totalTrades)*100).toFixed(1) + '%' : 'N/A'.padEnd(49)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  AI Chain Stats:                                                             ║`);
  
  const aiStats = ai.getStats();
  for (const [chain, stats] of Object.entries(aiStats)) {
    const chainName = CHAINS[chain].name.padEnd(12);
    console.log(`║    ${chainName} Win Rate: ${(stats.winRate*100).toFixed(1)}% | EV: ${stats.expectedValue.toFixed(3).padEnd(30)}║`);
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
}

// Run the bot
main().catch(console.error);





