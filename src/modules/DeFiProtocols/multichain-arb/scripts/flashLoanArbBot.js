// ═══════════════════════════════════════════════════════════════════════════════
// FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER
// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// Busca spreads entre Uniswap V3, Curve y SushiSwap
// Usa Flash Loans para ejecutar sin capital inicial

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

// Wallet con fondos
const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

// Chains configuradas
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    dexes: {
      uniswapV3: {
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
      },
      // Aerodrome (fork de Velodrome en Base)
      aerodrome: {
        router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      sushiswap: {
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      curve: {
        // Curve 3pool en Arbitrum
        tripool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353'
      }
    },
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDCe: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    dexes: {
      uniswapV3: {
        quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      },
      velodrome: {
        router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
      }
    },
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDCe: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────────

const QUOTER_V3_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SUSHI_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const CURVE_POOL_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function coins(uint256 i) external view returns (address)'
];

const VELODROME_ROUTER_ABI = [
  'function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 amount, bool stable)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────────

async function getUniswapV3Price(provider, quoterAddress, tokenIn, tokenOut, amountIn, fee = 500) {
  try {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V3_ABI, provider);
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0n
    };
    const result = await quoter.quoteExactInputSingle.staticCall(params);
    return { amountOut: result[0], gasEstimate: result[3], dex: 'UniswapV3', fee };
  } catch (error) {
    return null;
  }
}

async function getSushiswapPrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, SUSHI_ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    return { amountOut: amounts[1], gasEstimate: 150000n, dex: 'SushiSwap' };
  } catch (error) {
    return null;
  }
}

async function getVelodromePrice(provider, routerAddress, tokenIn, tokenOut, amountIn) {
  try {
    const router = new ethers.Contract(routerAddress, VELODROME_ROUTER_ABI, provider);
    const [amount, stable] = await router.getAmountOut(amountIn, tokenIn, tokenOut);
    return { amountOut: amount, gasEstimate: 120000n, dex: stable ? 'Velodrome-Stable' : 'Velodrome-Volatile' };
  } catch (error) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SPREAD FINDER
// ─────────────────────────────────────────────────────────────────────────────────

async function findSpreads(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return [];

  console.log(`\n   🔍 Buscando spreads en ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const spreads = [];

  // Pares a analizar
  const pairs = [
    { tokenIn: 'USDC', tokenOut: 'WETH', decimalsIn: 6 },
    { tokenIn: 'WETH', tokenOut: 'USDC', decimalsIn: 18 }
  ];

  // Cantidades a probar
  const amounts = [
    { label: '$100', usdc: ethers.parseUnits('100', 6), eth: ethers.parseUnits('0.03', 18) },
    { label: '$1,000', usdc: ethers.parseUnits('1000', 6), eth: ethers.parseUnits('0.3', 18) },
    { label: '$10,000', usdc: ethers.parseUnits('10000', 6), eth: ethers.parseUnits('3', 18) }
  ];

  for (const pair of pairs) {
    const tokenInAddr = chain.tokens[pair.tokenIn];
    const tokenOutAddr = chain.tokens[pair.tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    for (const amount of amounts) {
      const amountIn = pair.tokenIn === 'USDC' ? amount.usdc : amount.eth;
      const prices = [];

      // UniswapV3 con diferentes fees
      for (const fee of [100, 500, 3000]) {
        const result = await getUniswapV3Price(
          provider, 
          chain.dexes.uniswapV3.quoter,
          tokenInAddr,
          tokenOutAddr,
          amountIn,
          fee
        );
        if (result) {
          prices.push({ ...result, feeTier: fee });
        }
      }

      // SushiSwap (solo Arbitrum)
      if (chain.dexes.sushiswap) {
        const result = await getSushiswapPrice(
          provider,
          chain.dexes.sushiswap.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Velodrome/Aerodrome
      if (chain.dexes.velodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.velodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      if (chain.dexes.aerodrome) {
        const result = await getVelodromePrice(
          provider,
          chain.dexes.aerodrome.router,
          tokenInAddr,
          tokenOutAddr,
          amountIn
        );
        if (result) prices.push(result);
      }

      // Encontrar mejor y peor precio
      if (prices.length >= 2) {
        prices.sort((a, b) => Number(b.amountOut - a.amountOut));
        
        const best = prices[0];
        const worst = prices[prices.length - 1];
        
        const spreadBps = Number((best.amountOut - worst.amountOut) * 10000n / worst.amountOut);
        
        if (spreadBps > 5) { // Más de 0.05% spread
          spreads.push({
            chain: chain.name,
            pair: `${pair.tokenIn}/${pair.tokenOut}`,
            amount: amount.label,
            buyDex: worst.dex + (worst.feeTier ? ` (${worst.feeTier/10000}%)` : ''),
            sellDex: best.dex + (best.feeTier ? ` (${best.feeTier/10000}%)` : ''),
            spreadBps,
            potentialProfit: spreadBps / 100,
            buyPrice: worst.amountOut,
            sellPrice: best.amountOut
          });
        }
      }
    }
  }

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLASH LOAN PROFITABILITY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function calculateFlashLoanProfit(chainKey, spread) {
  const chain = CHAINS[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  
  // Flash loan fee (Uniswap V3 = 0.05%, Aave = 0.09%)
  const flashLoanFeeBps = 5; // 0.05%
  
  // Gas estimation
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const estimatedGas = 400000n; // Flash loan + 2 swaps
  const gasCostWei = gasPrice * estimatedGas;
  
  // ETH price assumption
  const ethPrice = 3500;
  const gasCostUsd = Number(ethers.formatEther(gasCostWei)) * ethPrice;
  
  // Calculate net profit
  const grossProfitPercent = spread.spreadBps / 100;
  const flashLoanFeePercent = flashLoanFeeBps / 100;
  const netProfitPercent = grossProfitPercent - flashLoanFeePercent;
  
  // Assuming $10,000 flash loan
  const loanAmount = 10000;
  const grossProfit = loanAmount * (grossProfitPercent / 100);
  const flashLoanFee = loanAmount * (flashLoanFeePercent / 100);
  const netProfitBeforeGas = grossProfit - flashLoanFee;
  const netProfit = netProfitBeforeGas - gasCostUsd;
  
  return {
    ...spread,
    loanAmount,
    grossProfit,
    flashLoanFee,
    gasCostUsd,
    netProfit,
    profitable: netProfit > 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ⚡ FLASH LOAN ARBITRAGE BOT - MULTI-DEX SPREAD FINDER                        ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Chains: Base, Arbitrum, Optimism`);
  console.log(`DEXs: UniswapV3, SushiSwap, Velodrome, Aerodrome`);

  const allSpreads = [];

  // Buscar spreads en cada chain
  for (const chainKey of ['base', 'arbitrum', 'optimism']) {
    const spreads = await findSpreads(chainKey);
    
    // Calcular profitabilidad con flash loan
    for (const spread of spreads) {
      const analysis = await calculateFlashLoanProfit(chainKey, spread);
      allSpreads.push(analysis);
    }
  }

  // Ordenar por profit
  allSpreads.sort((a, b) => b.netProfit - a.netProfit);

  // Mostrar resultados
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SPREADS ENCONTRADOS`);
  console.log(`${'═'.repeat(70)}\n`);

  if (allSpreads.length === 0) {
    console.log(`   No se encontraron spreads significativos (>0.05%)`);
    console.log(`   Esto es normal en mercados eficientes.`);
    console.log(`   El bot debe ejecutarse continuamente para capturar oportunidades.`);
  } else {
    for (const spread of allSpreads.slice(0, 10)) {
      const status = spread.profitable ? '✅ PROFITABLE' : '❌ NOT PROFITABLE';
      
      console.log(`   ${spread.chain} | ${spread.pair} | ${spread.amount}`);
      console.log(`   ├─ Spread: ${spread.spreadBps.toFixed(2)} bps (${spread.potentialProfit.toFixed(4)}%)`);
      console.log(`   ├─ Comprar en: ${spread.buyDex}`);
      console.log(`   ├─ Vender en: ${spread.sellDex}`);
      console.log(`   ├─ Flash Loan: $${spread.loanAmount.toLocaleString()}`);
      console.log(`   ├─ Ganancia Bruta: $${spread.grossProfit.toFixed(4)}`);
      console.log(`   ├─ Fee Flash Loan: $${spread.flashLoanFee.toFixed(4)}`);
      console.log(`   ├─ Costo Gas: $${spread.gasCostUsd.toFixed(4)}`);
      console.log(`   ├─ Ganancia Neta: $${spread.netProfit.toFixed(4)}`);
      console.log(`   └─ ${status}`);
      console.log('');
    }
  }

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log(`📈 RESUMEN`);
  console.log(`${'═'.repeat(70)}\n`);

  const profitable = allSpreads.filter(s => s.profitable);
  const totalPotentialProfit = profitable.reduce((sum, s) => sum + s.netProfit, 0);

  console.log(`   Total spreads encontrados: ${allSpreads.length}`);
  console.log(`   Spreads rentables: ${profitable.length}`);
  console.log(`   Ganancia potencial total: $${totalPotentialProfit.toFixed(2)}`);

  if (profitable.length > 0) {
    console.log(`\n   🎯 MEJOR OPORTUNIDAD:`);
    const best = profitable[0];
    console.log(`      ${best.chain} | ${best.pair}`);
    console.log(`      Comprar: ${best.buyDex} → Vender: ${best.sellDex}`);
    console.log(`      Ganancia: $${best.netProfit.toFixed(4)} por operación`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch(console.error);

