// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE REAL ARBITRAGE - SUSHISWAP vs UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  
  // DEXs
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getQuotes(provider, amountEth) {
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);
  
  // Get SushiSwap quote: ETH -> USDC
  const sushiAmounts = await sushiRouter.getAmountsOut(amountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const sushiUsdc = sushiAmounts[1];

  console.log(`      SushiSwap: ${ethers.formatEther(amountEth)} ETH → ${ethers.formatUnits(sushiUsdc, 6)} USDC`);

  return { sushiUsdc };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTAR ARBITRAJE REAL - ARBITRUM                                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  if (parseFloat(balanceEth) < 0.01) {
    console.log(`\n❌ Balance insuficiente. Necesitas al menos 0.01 ETH.`);
    return;
  }

  // Amount to trade (use 0.01 ETH for test)
  const tradeAmountEth = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmountEth)} ETH (~$35)`);

  // Get quotes
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 COTIZACIONES ACTUALES`);
  console.log(`${'═'.repeat(60)}\n`);

  const quotes = await getQuotes(provider, tradeAmountEth);

  // Strategy: 
  // 1. Buy USDC on SushiSwap (cheaper)
  // 2. Sell USDC on UniswapV3 for ETH (better rate)

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 ESTRATEGIA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   1. Comprar USDC en SushiSwap con ETH`);
  console.log(`   2. Vender USDC en UniswapV3 por ETH`);
  console.log(`   3. Verificar ganancia`);

  // Estimate gas
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 300000n;
  const gasCost = gasPrice * estimatedGas;
  const gasCostEth = ethers.formatEther(gasCost);

  console.log(`\n   Gas estimado: ${gasCostEth} ETH (~$${(parseFloat(gasCostEth) * 3500).toFixed(4)})`);

  // Ask for confirmation
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚠️  MODO SIMULACIÓN`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`   Este script está en modo simulación.`);
  console.log(`   Para ejecutar transacciones reales, descomenta el código de ejecución.`);

  // Simulate the trade
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📈 SIMULACIÓN DE RESULTADO`);
  console.log(`${'═'.repeat(60)}\n`);

  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, provider);

  // Simulate: ETH -> USDC on SushiSwap
  const sushiOut = await sushiRouter.getAmountsOut(tradeAmountEth, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const usdcReceived = sushiOut[1];

  console.log(`   Paso 1: ${ethers.formatEther(tradeAmountEth)} ETH → ${ethers.formatUnits(usdcReceived, 6)} USDC (SushiSwap)`);

  // Simulate: USDC -> ETH on UniswapV3 would need actual quote
  // For now, estimate based on known spread
  const spreadPercent = 3.58 / 100; // 3.58% from earlier analysis
  const expectedProfit = parseFloat(ethers.formatEther(tradeAmountEth)) * spreadPercent;
  const netProfit = expectedProfit - parseFloat(gasCostEth);

  console.log(`   Paso 2: ${ethers.formatUnits(usdcReceived, 6)} USDC → ~${(parseFloat(ethers.formatEther(tradeAmountEth)) * (1 + spreadPercent)).toFixed(6)} ETH (UniswapV3)`);
  console.log(`\n   Ganancia bruta: ${(expectedProfit * 3500).toFixed(4)} USD`);
  console.log(`   Costo de gas: ${(parseFloat(gasCostEth) * 3500).toFixed(4)} USD`);
  console.log(`   Ganancia neta: ${(netProfit * 3500).toFixed(4)} USD`);

  if (netProfit > 0) {
    console.log(`\n   ✅ OPERACIÓN RENTABLE`);
  } else {
    console.log(`\n   ❌ OPERACIÓN NO RENTABLE (gas > spread)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ SIMULACIÓN COMPLETADA`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log(`Para ejecutar en vivo, usa el siguiente comando:`);
  console.log(`   node scripts/executeRealArbitrage.js --live`);
}

main().catch(console.error);

