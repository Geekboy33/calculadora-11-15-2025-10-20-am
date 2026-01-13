// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      WETH: '0x4200000000000000000000000000000000000006'
    }
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    tokens: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
};

// QuoterV2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function testQuote(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Testing ${chain.name} Quoter...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    // Quote 100 USDC -> WETH
    const amountIn = ethers.parseUnits('100', 6); // 100 USDC

    const params = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500, // 0.05%
      sqrtPriceLimitX96: 0n
    };

    // Use staticCall to simulate
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    
    const amountOut = result[0];
    const gasEstimate = result[3];

    const ethOut = ethers.formatEther(amountOut);
    console.log(`      100 USDC → ${parseFloat(ethOut).toFixed(6)} WETH`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);

    return { success: true, amountOut, gasEstimate };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false, error: error.message };
  }
}

async function testGasPrice(chainKey) {
  const chain = CHAINS[chainKey];
  
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice;
    const maxFee = feeData.maxFeePerGas;
    const priorityFee = feeData.maxPriorityFeePerGas;

    console.log(`      Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    if (maxFee) {
      console.log(`      Max Fee: ${ethers.formatUnits(maxFee, 'gwei')} gwei`);
    }
    if (priorityFee) {
      console.log(`      Priority Fee: ${ethers.formatUnits(priorityFee, 'gwei')} gwei`);
    }

    return { success: true, gasPrice, maxFee, priorityFee };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 50)}`);
    return { success: false };
  }
}

async function simulateArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  console.log(`\n   Simulating Arbitrage on ${chain.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.quoterV2, QUOTER_ABI, provider);

    const amountIn = ethers.parseUnits('1000', 6); // 1000 USDC

    // Leg 1: USDC -> WETH (fee 0.05%)
    const params1 = {
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0n
    };

    const result1 = await quoter.quoteExactInputSingle.staticCall(params1);
    const wethAmount = result1[0];
    const gas1 = Number(result1[3]);

    // Leg 2: WETH -> USDC (fee 0.30%)
    const params2 = {
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      amountIn: wethAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0n
    };

    const result2 = await quoter.quoteExactInputSingle.staticCall(params2);
    const usdcOut = result2[0];
    const gas2 = Number(result2[3]);

    // Calculate profit
    const inUsd = 1000;
    const outUsd = Number(ethers.formatUnits(usdcOut, 6));
    const profit = outUsd - inUsd;
    const profitPercent = (profit / inUsd) * 100;

    // Calculate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalGas = BigInt(gas1 + gas2 + 50000); // Add overhead
    const gasCostWei = totalGas * gasPrice;
    
    // Estimate gas cost in USD (assuming ETH = $3500)
    const ethPrice = 3500;
    const gasCostEth = Number(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * ethPrice;

    const netProfit = profit - gasCostUsd;

    console.log(`      Input: $${inUsd.toFixed(2)} USDC`);
    console.log(`      Output: $${outUsd.toFixed(2)} USDC`);
    console.log(`      Gross Profit: $${profit.toFixed(4)} (${profitPercent.toFixed(4)}%)`);
    console.log(`      Gas Cost: $${gasCostUsd.toFixed(4)}`);
    console.log(`      Net Profit: $${netProfit.toFixed(4)}`);
    console.log(`      Profitable: ${netProfit > 0 ? '✅ YES' : '❌ NO'}`);

    return { 
      success: true, 
      inUsd, 
      outUsd, 
      profit, 
      gasCostUsd, 
      netProfit,
      profitable: netProfit > 0
    };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧪 MULTI-CHAIN ARBITRAGE BOT - SYSTEM TEST                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const chainKey of Object.keys(CHAINS)) {
    const chain = CHAINS[chainKey];
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 ${chain.name.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    results[chainKey] = {};

    // Test 1: RPC Connection
    console.log(`\n   1️⃣ Testing RPC Connection...`);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, block] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      console.log(`      ✅ Connected (Block #${block})`);
      results[chainKey].rpc = true;
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message.slice(0, 40)}`);
      results[chainKey].rpc = false;
      continue;
    }

    // Test 2: Gas Price
    console.log(`\n   2️⃣ Testing Gas Price...`);
    const gasResult = await testGasPrice(chainKey);
    results[chainKey].gas = gasResult.success;

    // Test 3: Quote
    console.log(`\n   3️⃣ Testing Uniswap V3 Quoter...`);
    const quoteResult = await testQuote(chainKey);
    results[chainKey].quote = quoteResult.success;

    // Test 4: Arbitrage Simulation
    console.log(`\n   4️⃣ Simulating Arbitrage...`);
    const arbResult = await simulateArbitrage(chainKey);
    results[chainKey].arb = arbResult;
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const [chainKey, result] of Object.entries(results)) {
    const chain = CHAINS[chainKey];
    const rpc = result.rpc ? '✅' : '❌';
    const gas = result.gas ? '✅' : '❌';
    const quote = result.quote ? '✅' : '❌';
    const arb = result.arb?.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';

    console.log(`   ${chain.name}:`);
    console.log(`      RPC: ${rpc}  Gas: ${gas}  Quote: ${quote}`);
    if (result.arb?.success) {
      console.log(`      Arbitrage: ${arb} (Net: $${result.arb.netProfit?.toFixed(4) || 'N/A'})`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ System test complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);




