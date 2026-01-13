/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);




 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);


 * ║                    MULTI-CHAIN ARBITRAGE BOT - TEST SCRIPT                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este script verifica que todos los componentes del bot funcionan             ║
 * ║  correctamente antes de ejecutar en modo real.                                ║
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

const CONFIG = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || process.env.VITE_ETH_WALLET_ADDRESS || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || '',
  
  CHAINS: {
    base: {
      name: 'Base',
      chainId: 8453,
      rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      explorer: 'https://basescan.org',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      dex: {
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481'
      }
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      tokens: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      tokens: {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      },
      dex: {
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
      }
    }
  }
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter V2 ABI for price quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('   ', data);
  }
}

function formatEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

function formatUsdc(amount, decimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testRpcConnection(chainKey, chainConfig) {
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);
    
    if (Number(network.chainId) !== chainConfig.chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainConfig.chainId}, got ${network.chainId}`);
    }
    
    return {
      success: true,
      blockNumber,
      chainId: Number(network.chainId),
      provider
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testWalletBalance(provider, chainConfig, chainName) {
  try {
    // Check native balance (ETH/MATIC)
    const nativeBalance = await provider.getBalance(CONFIG.WALLET_ADDRESS);
    
    // Check token balances
    const balances = {
      native: formatEth(nativeBalance)
    };
    
    for (const [tokenName, tokenAddress] of Object.entries(chainConfig.tokens)) {
      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          token.balanceOf(CONFIG.WALLET_ADDRESS),
          token.decimals()
        ]);
        balances[tokenName] = formatUsdc(balance, decimals);
      } catch (e) {
        balances[tokenName] = 'Error';
      }
    }
    
    return {
      success: true,
      balances
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQuoter(provider, chainConfig) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Quote 0.01 ETH -> USDC
    const amountIn = ethers.parseEther('0.01');
    
    const params = {
      tokenIn: chainConfig.tokens.WETH,
      tokenOut: chainConfig.tokens.USDC,
      amountIn: amountIn,
      fee: 500, // 0.05% fee tier
      sqrtPriceLimitX96: 0n
    };
    
    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    const amountOut = result[0];
    
    // Calculate price
    const ethPrice = parseFloat(ethers.formatUnits(amountOut, 6)) / 0.01;
    
    return {
      success: true,
      quote: {
        amountIn: '0.01 ETH',
        amountOut: `${formatUsdc(amountOut)} USDC`,
        ethPrice: `$${ethPrice.toFixed(2)}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function findArbitrageOpportunity(provider, chainConfig, chainName) {
  try {
    const quoter = new ethers.Contract(chainConfig.dex.quoterV2, QUOTER_V2_ABI, provider);
    
    // Test different fee tiers for arbitrage
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    const testAmount = ethers.parseEther('0.1'); // 0.1 ETH
    
    const quotes = [];
    
    for (const fee of feeTiers) {
      try {
        // ETH -> USDC
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.tokens.WETH,
          tokenOut: chainConfig.tokens.USDC,
          amountIn: testAmount,
          fee: fee,
          sqrtPriceLimitX96: 0n
        });
        
        quotes.push({
          fee: fee / 10000 + '%',
          amountOut: formatUsdc(result[0])
        });
      } catch (e) {
        // Fee tier not available
      }
    }
    
    if (quotes.length >= 2) {
      // Sort by output amount
      quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));
      const best = parseFloat(quotes[0].amountOut);
      const worst = parseFloat(quotes[quotes.length - 1].amountOut);
      const spread = ((best - worst) / worst * 100).toFixed(4);
      
      return {
        success: true,
        quotes,
        bestRoute: quotes[0],
        worstRoute: quotes[quotes.length - 1],
        spreadPercent: spread + '%',
        potentialProfit: (best - worst).toFixed(4) + ' USDC'
      };
    }
    
    return {
      success: true,
      quotes,
      message: 'Not enough fee tiers available for comparison'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                  ║
║                                                                               ║
║   Testing all components before live execution...                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  log('📍', `Wallet: ${CONFIG.WALLET_ADDRESS}`);
  log('🔑', `Private Key: ${CONFIG.PRIVATE_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  const results = {
    chains: {},
    summary: {
      totalChains: 0,
      connectedChains: 0,
      chainsWithFunds: 0,
      quoterWorking: 0,
      arbOpportunities: 0
    }
  };
  
  // Test each chain
  for (const [chainKey, chainConfig] of Object.entries(CONFIG.CHAINS)) {
    results.summary.totalChains++;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔗 Testing ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`${'═'.repeat(70)}`);
    
    results.chains[chainKey] = {};
    
    // Test 1: RPC Connection
    log('🔌', 'Testing RPC connection...');
    const rpcResult = await testRpcConnection(chainKey, chainConfig);
    results.chains[chainKey].rpc = rpcResult;
    
    if (rpcResult.success) {
      results.summary.connectedChains++;
      log('✅', `Connected! Block: ${rpcResult.blockNumber}`);
      
      // Test 2: Wallet Balances
      log('💰', 'Checking wallet balances...');
      const balanceResult = await testWalletBalance(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].balances = balanceResult;
      
      if (balanceResult.success) {
        const hasNativeFunds = parseFloat(balanceResult.balances.native) > 0.001;
        if (hasNativeFunds) {
          results.summary.chainsWithFunds++;
        }
        
        console.log('   Balances:');
        for (const [token, balance] of Object.entries(balanceResult.balances)) {
          const symbol = token === 'native' ? 'ETH' : token;
          const status = parseFloat(balance) > 0 ? '✅' : '⚪';
          console.log(`     ${status} ${symbol}: ${balance}`);
        }
      } else {
        log('❌', `Balance check failed: ${balanceResult.error}`);
      }
      
      // Test 3: Quoter
      log('📊', 'Testing DEX quoter...');
      const quoterResult = await testQuoter(rpcResult.provider, chainConfig);
      results.chains[chainKey].quoter = quoterResult;
      
      if (quoterResult.success) {
        results.summary.quoterWorking++;
        log('✅', `Quote: ${quoterResult.quote.amountIn} = ${quoterResult.quote.amountOut}`);
        log('💵', `ETH Price: ${quoterResult.quote.ethPrice}`);
      } else {
        log('❌', `Quoter failed: ${quoterResult.error}`);
      }
      
      // Test 4: Arbitrage Opportunity Scan
      log('🔍', 'Scanning for arbitrage opportunities...');
      const arbResult = await findArbitrageOpportunity(rpcResult.provider, chainConfig, chainConfig.name);
      results.chains[chainKey].arbitrage = arbResult;
      
      if (arbResult.success && arbResult.quotes.length >= 2) {
        results.summary.arbOpportunities++;
        log('📈', `Fee tier spread: ${arbResult.spreadPercent}`);
        log('💰', `Potential profit (0.1 ETH): ${arbResult.potentialProfit}`);
        console.log('   Available routes:');
        arbResult.quotes.forEach(q => {
          console.log(`     • ${q.fee} tier: ${q.amountOut} USDC`);
        });
      } else if (arbResult.success) {
        log('⚪', arbResult.message || 'No significant spread found');
      } else {
        log('❌', `Scan failed: ${arbResult.error}`);
      }
      
    } else {
      log('❌', `RPC connection failed: ${rpcResult.error}`);
    }
  }
  
  // Print Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 TEST SUMMARY                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Chains Configured:    ${results.summary.totalChains}                                              ║`);
  console.log(`║  Chains Connected:     ${results.summary.connectedChains}/${results.summary.totalChains} ${results.summary.connectedChains === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Chains with Funds:    ${results.summary.chainsWithFunds}/${results.summary.totalChains} ${results.summary.chainsWithFunds > 0 ? '✅' : '❌'}                                            ║`);
  console.log(`║  Quoters Working:      ${results.summary.quoterWorking}/${results.summary.totalChains} ${results.summary.quoterWorking === results.summary.totalChains ? '✅' : '⚠️'}                                            ║`);
  console.log(`║  Arb Opportunities:    ${results.summary.arbOpportunities}                                              ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
  
  // Overall status
  const ready = results.summary.connectedChains > 0 && 
                results.summary.chainsWithFunds > 0 && 
                results.summary.quoterWorking > 0;
  
  if (ready) {
    console.log(`║  🟢 BOT STATUS: READY TO RUN                                                 ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in DRY RUN mode (no real trades):                          ║`);
    console.log(`║    node scripts/smartArbBot.js                                               ║`);
    console.log(`║                                                                               ║`);
    console.log(`║  To start the bot in LIVE mode:                                              ║`);
    console.log(`║    DRY_RUN=false node scripts/smartArbBot.js                                 ║`);
    console.log(`║                                                                               ║`);
  } else {
    console.log(`║  🔴 BOT STATUS: NOT READY                                                    ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
    if (results.summary.connectedChains === 0) {
      console.log(`║  ❌ No chains connected - check RPC endpoints                                ║`);
    }
    if (results.summary.chainsWithFunds === 0) {
      console.log(`║  ❌ No funds detected - deposit ETH to wallet                                ║`);
    }
    if (results.summary.quoterWorking === 0) {
      console.log(`║  ❌ Quoters not working - check DEX configuration                            ║`);
    }
  }
  
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
  
  return results;
}

// Run tests
runTests().catch(console.error);

