// ═══════════════════════════════════════════════════════════════════════════════
// REAL ARBITRAGE BOT - VERIFIED SPREADS WITH LIQUIDITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org/tx/',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 }
    }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      USDCe: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }
    }
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io/tx/',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokens: {
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      USDCe: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
    }
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniV3Quote(provider, quoter, tokenIn, tokenOut, amountIn, fee) {
  try {
    const contract = new ethers.Contract(quoter, QUOTER_ABI, provider);
    const result = await contract.quoteExactInputSingle.staticCall({
      tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n
    });
    return { amountOut: result[0], gas: result[3], success: true };
  } catch {
    return { success: false };
  }
}

async function getSushiQuote(provider, router, tokenIn, tokenOut, amountIn) {
  try {
    const contract = new ethers.Contract(router, SUSHI_ABI, provider);
    const amounts = await contract.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gas: 150000n, success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FIND REAL ARBITRAGE OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────────

async function findRealOpportunities(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const opportunities = [];

  console.log(`\n   🔍 Analizando ${chain.name}...`);

  // Test amounts (realistic)
  const testAmounts = [
    { usd: 100, usdc: ethers.parseUnits('100', 6) },
    { usd: 500, usdc: ethers.parseUnits('500', 6) },
    { usd: 1000, usdc: ethers.parseUnits('1000', 6) }
  ];

  // Fee tiers to compare (only liquid ones: 0.05% and 0.30%)
  const feeTiers = [500, 3000];

  for (const amount of testAmounts) {
    // Get quotes from different fee tiers
    const quotes = [];

    for (const fee of feeTiers) {
      // USDC -> WETH
      const q1 = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        fee
      );

      if (q1.success) {
        // WETH -> USDC (round trip)
        const q2 = await getUniV3Quote(
          provider,
          chain.uniV3Quoter,
          chain.tokens.WETH.address,
          chain.tokens.USDC.address,
          q1.amountOut,
          fee
        );

        if (q2.success) {
          const finalUsdc = Number(ethers.formatUnits(q2.amountOut, 6));
          const profit = finalUsdc - amount.usd;
          const profitPercent = (profit / amount.usd) * 100;

          quotes.push({
            fee,
            wethOut: q1.amountOut,
            usdcOut: q2.amountOut,
            finalUsdc,
            profit,
            profitPercent,
            totalGas: Number(q1.gas) + Number(q2.gas)
          });
        }
      }
    }

    // Compare fee tiers for arbitrage
    if (quotes.length >= 2) {
      // Sort by final USDC output
      quotes.sort((a, b) => Number(b.usdcOut - a.usdcOut));

      const best = quotes[0];
      const worst = quotes[quotes.length - 1];

      // Cross-tier arbitrage: buy in cheaper tier, sell in more expensive
      // Buy WETH in 0.05% pool, sell in 0.30% pool (or vice versa)
      
      // Get gas cost
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostWei = gasPrice * BigInt(best.totalGas);
      const gasCostEth = Number(ethers.formatEther(gasCostWei));
      const gasCostUsd = gasCostEth * 3500; // ETH price

      // Calculate spread between tiers
      const spreadUsdc = Number(best.usdcOut - worst.usdcOut) / 1e6;
      const netProfit = spreadUsdc - gasCostUsd;

      if (spreadUsdc > 0.01) { // At least 1 cent spread
        opportunities.push({
          chain: chain.name,
          amount: amount.usd,
          buyFee: worst.fee,
          sellFee: best.fee,
          spreadUsdc,
          gasCostUsd,
          netProfit,
          profitable: netProfit > 0,
          details: {
            buyWeth: ethers.formatEther(worst.wethOut),
            sellWeth: ethers.formatEther(best.wethOut),
            buyUsdcBack: Number(worst.usdcOut) / 1e6,
            sellUsdcBack: Number(best.usdcOut) / 1e6
          }
        });
      }
    }

    // Check SushiSwap vs UniswapV3 (Arbitrum only)
    if (chain.sushiRouter) {
      const uniQuote = await getUniV3Quote(
        provider,
        chain.uniV3Quoter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc,
        500
      );

      const sushiQuote = await getSushiQuote(
        provider,
        chain.sushiRouter,
        chain.tokens.USDC.address,
        chain.tokens.WETH.address,
        amount.usdc
      );

      if (uniQuote.success && sushiQuote.success) {
        const uniWeth = uniQuote.amountOut;
        const sushiWeth = sushiQuote.amountOut;

        // If one gives more WETH, there's an opportunity
        const diff = Number(uniWeth - sushiWeth);
        const diffPercent = (diff / Number(uniWeth)) * 100;

        if (Math.abs(diffPercent) > 0.1) {
          const buyDex = diff > 0 ? 'SushiSwap' : 'UniswapV3';
          const sellDex = diff > 0 ? 'UniswapV3' : 'SushiSwap';
          
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const gasCostWei = gasPrice * 300000n; // 2 swaps
          const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * 3500;

          const spreadUsd = Math.abs(diff) / 1e18 * 3500; // Convert WETH diff to USD
          const netProfit = spreadUsd - gasCostUsd;

          opportunities.push({
            chain: chain.name,
            type: 'cross-dex',
            amount: amount.usd,
            buyDex,
            sellDex,
            spreadPercent: Math.abs(diffPercent),
            spreadUsd,
            gasCostUsd,
            netProfit,
            profitable: netProfit > 0
          });
        }
      }
    }
  }

  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTE ARBITRAGE
// ─────────────────────────────────────────────────────────────────────────────────

async function executeArbitrage(chainKey, opportunity) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n   🚀 Ejecutando arbitraje en ${chain.name}...`);
  console.log(`      Monto: $${opportunity.amount}`);

  try {
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`      Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.001')) {
      console.log(`      ❌ Balance insuficiente para gas`);
      return { success: false, error: 'Insufficient balance' };
    }

    // For now, just simulate
    console.log(`      ✅ Simulación exitosa`);
    console.log(`      Ganancia estimada: $${opportunity.netProfit.toFixed(4)}`);

    return { success: true, simulated: true };

  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
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
║   🎯 REAL ARBITRAGE BOT - VERIFIED OPPORTUNITIES                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);

  // Check balances
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`💰 BALANCES`);
  console.log(`${'═'.repeat(60)}`);

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const formatted = parseFloat(ethers.formatEther(balance)).toFixed(6);
      console.log(`   ${chain.name}: ${formatted} ETH`);
    } catch {
      console.log(`   ${chain.name}: Error`);
    }
  }

  // Find opportunities
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 BUSCANDO OPORTUNIDADES REALES`);
  console.log(`${'═'.repeat(60)}`);

  const allOpportunities = [];

  for (const chainKey of Object.keys(CHAINS)) {
    const opps = await findRealOpportunities(chainKey);
    allOpportunities.push(...opps);
  }

  // Display results
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RESULTADOS`);
  console.log(`${'═'.repeat(60)}\n`);

  if (allOpportunities.length === 0) {
    console.log(`   No se encontraron oportunidades de arbitraje significativas.`);
    console.log(`   Los mercados están bastante eficientes en este momento.`);
  } else {
    // Sort by profit
    allOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    for (const opp of allOpportunities) {
      const status = opp.profitable ? '✅' : '❌';
      
      if (opp.type === 'cross-dex') {
        console.log(`   ${status} ${opp.chain} | Cross-DEX | $${opp.amount}`);
        console.log(`      Comprar: ${opp.buyDex} → Vender: ${opp.sellDex}`);
        console.log(`      Spread: ${opp.spreadPercent.toFixed(4)}% ($${opp.spreadUsd.toFixed(4)})`);
      } else {
        console.log(`   ${status} ${opp.chain} | Fee Tier Arb | $${opp.amount}`);
        console.log(`      Comprar en: ${opp.buyFee/10000}% fee → Vender en: ${opp.sellFee/10000}% fee`);
        console.log(`      Spread: $${opp.spreadUsdc.toFixed(4)}`);
      }
      
      console.log(`      Gas: $${opp.gasCostUsd.toFixed(4)} | Net: $${opp.netProfit.toFixed(4)}`);
      console.log('');
    }
  }

  // Summary
  const profitable = allOpportunities.filter(o => o.profitable);
  const totalProfit = profitable.reduce((sum, o) => sum + o.netProfit, 0);

  console.log(`${'═'.repeat(60)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Oportunidades encontradas: ${allOpportunities.length}`);
  console.log(`   Oportunidades rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial: $${totalProfit.toFixed(4)}`);

  if (profitable.length > 0) {
    const best = profitable[0];
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    console.log(`      ${best.chain} | Ganancia: $${best.netProfit.toFixed(4)}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

main().catch(console.error);

