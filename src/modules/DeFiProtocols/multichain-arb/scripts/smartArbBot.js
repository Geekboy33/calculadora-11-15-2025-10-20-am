// ═══════════════════════════════════════════════════════════════════════════════
// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);



// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// SMART ARBITRAGE BOT - DETECTS OPTIMAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

const SUSHI_ABI = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const QUOTER_ABI = ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'];

async function analyzeSpread(provider, amountEth) {
  const sushi = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ABI, provider);
  const quoter = new ethers.Contract(ARBITRUM.uniV3Quoter, QUOTER_ABI, provider);

  // Route 1: SushiSwap ETH→USDC, then UniswapV3 USDC→ETH
  const sushiToUsdc = await sushi.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcFromSushi = sushiToUsdc[1];
  
  const uniToEth = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.USDC,
    tokenOut: ARBITRUM.WETH,
    amountIn: usdcFromSushi,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const ethFromUni = uniToEth[0];
  
  const route1Profit = ethFromUni - amountEth;
  const route1ProfitPercent = Number(route1Profit * 10000n / amountEth) / 100;

  // Route 2: UniswapV3 ETH→USDC, then SushiSwap USDC→ETH
  const uniToUsdc = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ARBITRUM.WETH,
    tokenOut: ARBITRUM.USDC,
    amountIn: amountEth,
    fee: 500,
    sqrtPriceLimitX96: 0n
  });
  const usdcFromUni = uniToUsdc[0];

  const sushiToEth = await sushi.getAmountsOut(usdcFromUni, [ARBITRUM.USDC, ARBITRUM.WETH]);
  const ethFromSushi = sushiToEth[1];

  const route2Profit = ethFromSushi - amountEth;
  const route2ProfitPercent = Number(route2Profit * 10000n / amountEth) / 100;

  return {
    route1: {
      name: 'SushiSwap→UniswapV3',
      path: 'ETH→USDC(Sushi)→ETH(Uni)',
      profit: route1Profit,
      profitPercent: route1ProfitPercent,
      usdcAmount: usdcFromSushi,
      ethOut: ethFromUni
    },
    route2: {
      name: 'UniswapV3→SushiSwap',
      path: 'ETH→USDC(Uni)→ETH(Sushi)',
      profit: route2Profit,
      profitPercent: route2ProfitPercent,
      usdcAmount: usdcFromUni,
      ethOut: ethFromSushi
    }
  };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🧠 SMART ARBITRAGE BOT - ANÁLISIS BIDIRECCIONAL                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Analyze different amounts
  const amounts = [
    ethers.parseEther('0.01'),
    ethers.parseEther('0.02'),
    ethers.parseEther('0.025')
  ];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 ANÁLISIS DE SPREADS BIDIRECCIONAL`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get gas cost estimate
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const estimatedGas = 300000n; // 2 swaps + approve
  const gasCostEth = gasPrice * estimatedGas;
  const gasCostUsd = Number(ethers.formatEther(gasCostEth)) * 3500;

  console.log(`   Gas estimado: ${ethers.formatEther(gasCostEth)} ETH (~$${gasCostUsd.toFixed(4)})\n`);

  let bestOpportunity = null;

  for (const amount of amounts) {
    const amountEth = ethers.formatEther(amount);
    console.log(`   Monto: ${amountEth} ETH (~$${(parseFloat(amountEth) * 3500).toFixed(2)})`);

    try {
      const analysis = await analyzeSpread(provider, amount);

      // Route 1
      const r1 = analysis.route1;
      const r1NetProfit = r1.profit - gasCostEth;
      const r1NetProfitUsd = Number(ethers.formatEther(r1NetProfit)) * 3500;
      const r1Status = r1NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r1Status} ${r1.name}: ${r1.profitPercent.toFixed(4)}% | Net: $${r1NetProfitUsd.toFixed(4)}`);

      // Route 2
      const r2 = analysis.route2;
      const r2NetProfit = r2.profit - gasCostEth;
      const r2NetProfitUsd = Number(ethers.formatEther(r2NetProfit)) * 3500;
      const r2Status = r2NetProfit > 0n ? '✅' : '❌';
      
      console.log(`      ${r2Status} ${r2.name}: ${r2.profitPercent.toFixed(4)}% | Net: $${r2NetProfitUsd.toFixed(4)}`);

      // Track best opportunity
      if (r1NetProfit > 0n && (!bestOpportunity || r1NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r1, amount, netProfit: r1NetProfit, netProfitUsd: r1NetProfitUsd };
      }
      if (r2NetProfit > 0n && (!bestOpportunity || r2NetProfit > bestOpportunity.netProfit)) {
        bestOpportunity = { ...r2, amount, netProfit: r2NetProfit, netProfitUsd: r2NetProfitUsd };
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.slice(0, 40)}`);
    }
    console.log('');
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESULTADO`);
  console.log(`${'═'.repeat(70)}\n`);

  if (bestOpportunity) {
    console.log(`   ✅ OPORTUNIDAD ENCONTRADA:`);
    console.log(`      Ruta: ${bestOpportunity.name}`);
    console.log(`      Monto: ${ethers.formatEther(bestOpportunity.amount)} ETH`);
    console.log(`      Ganancia neta: $${bestOpportunity.netProfitUsd.toFixed(4)}`);
    console.log(`\n   Para ejecutar, usa: node scripts/executeLiveArbitrage.js`);
  } else {
    console.log(`   ❌ No hay oportunidades rentables en este momento.`);
    console.log(`      Los spreads son menores que el costo del gas.`);
    console.log(`\n   💡 Sugerencias:`);
    console.log(`      - Esperar momentos de alta volatilidad`);
    console.log(`      - Usar Flash Loans para mayor capital`);
    console.log(`      - Monitorear continuamente con un bot`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);





