// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);



// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);


// EXECUTE LIVE ARBITRAGE - SUSHISWAP → UNISWAP V3 ON ARBITRUM
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const ARBITRUM = {
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io/tx/',
  chainId: 42161,
  
  // DEXs
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  
  // Tokens
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// ABIs
const SUSHI_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const UNI_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────────

async function executeLiveArbitrage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 EJECUTANDO ARBITRAJE EN VIVO - ARBITRUM                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const provider = new ethers.JsonRpcProvider(ARBITRUM.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Wallet: ${wallet.address}`);

  // Check initial balance
  const initialBalance = await provider.getBalance(wallet.address);
  console.log(`Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);

  // Trade amount (0.01 ETH for safety)
  const tradeAmount = ethers.parseEther('0.01');
  console.log(`\nMonto a operar: ${ethers.formatEther(tradeAmount)} ETH`);

  // Get SushiSwap quote
  const sushiRouter = new ethers.Contract(ARBITRUM.sushiRouter, SUSHI_ROUTER_ABI, wallet);
  const sushiAmounts = await sushiRouter.getAmountsOut(tradeAmount, [ARBITRUM.WETH, ARBITRUM.USDC]);
  const expectedUsdc = sushiAmounts[1];
  
  console.log(`\nCotización SushiSwap: ${ethers.formatEther(tradeAmount)} ETH → ${ethers.formatUnits(expectedUsdc, 6)} USDC`);

  // Calculate minimum output with 1% slippage
  const minUsdc = expectedUsdc * 99n / 100n;
  console.log(`Mínimo aceptable (1% slippage): ${ethers.formatUnits(minUsdc, 6)} USDC`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📝 PASO 1: Swap ETH → USDC en SushiSwap`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap on SushiSwap
    console.log(`   Ejecutando swap...`);
    
    const tx1 = await sushiRouter.swapExactETHForTokens(
      minUsdc,
      [ARBITRUM.WETH, ARBITRUM.USDC],
      wallet.address,
      deadline,
      { value: tradeAmount, gasLimit: 300000 }
    );

    console.log(`   TX Hash: ${tx1.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt1 = await tx1.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt1.blockNumber}`);
    console.log(`   Gas usado: ${receipt1.gasUsed.toString()}`);

    // Check USDC balance
    const usdc = new ethers.Contract(ARBITRUM.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n   USDC recibido: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 PASO 2: Swap USDC → ETH en UniswapV3`);
    console.log(`${'═'.repeat(60)}\n`);

    // Approve UniswapV3 Router
    console.log(`   Aprobando UniswapV3 Router...`);
    const approveTx = await usdc.approve(ARBITRUM.uniV3Router, usdcBalance);
    await approveTx.wait();
    console.log(`   ✅ Aprobado`);

    // Execute swap on UniswapV3
    const uniRouter = new ethers.Contract(ARBITRUM.uniV3Router, UNI_V3_ROUTER_ABI, wallet);
    
    // Calculate minimum ETH output (1% slippage from original amount)
    const minEthOut = tradeAmount * 99n / 100n;

    console.log(`   Ejecutando swap USDC → ETH...`);

    const tx2 = await uniRouter.exactInputSingle({
      tokenIn: ARBITRUM.USDC,
      tokenOut: ARBITRUM.WETH,
      fee: 500, // 0.05% pool
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });

    console.log(`   TX Hash: ${tx2.hash}`);
    console.log(`   Explorer: ${ARBITRUM.explorer}${tx2.hash}`);
    console.log(`   Esperando confirmación...`);

    const receipt2 = await tx2.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt2.blockNumber}`);
    console.log(`   Gas usado: ${receipt2.gasUsed.toString()}`);

    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    const profit = finalBalance - initialBalance;
    const profitEth = ethers.formatEther(profit);
    const profitUsd = parseFloat(profitEth) * 3500;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`   Balance inicial: ${ethers.formatEther(initialBalance)} ETH`);
    console.log(`   Balance final:   ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Diferencia:      ${profitEth} ETH`);
    console.log(`   En USD:          $${profitUsd.toFixed(4)}`);

    if (profit > 0n) {
      console.log(`\n   ✅ ¡ARBITRAJE EXITOSO! Ganancia: $${profitUsd.toFixed(4)}`);
    } else {
      console.log(`\n   ⚠️  Pérdida (probablemente por gas): $${Math.abs(profitUsd).toFixed(4)}`);
    }

    console.log(`\n   Transacciones:`);
    console.log(`   1. ${ARBITRUM.explorer}${tx1.hash}`);
    console.log(`   2. ${ARBITRUM.explorer}${tx2.hash}`);

  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient')) {
      console.log(`   El balance es insuficiente para la operación.`);
    }
    if (error.message.includes('slippage')) {
      console.log(`   El precio cambió demasiado (slippage).`);
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Confirm before executing
async function main() {
  console.log(`\n⚠️  ADVERTENCIA: Este script ejecutará transacciones REALES en Arbitrum Mainnet.`);
  console.log(`   Se usarán fondos reales de la wallet.`);
  console.log(`\n   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  await executeLiveArbitrage();
}

main().catch(console.error);




