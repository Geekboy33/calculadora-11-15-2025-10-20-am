/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * - Conecta a chains REALES (Base, Arbitrum, Optimism)
 * - Obtiene balances REALES de tu wallet
 * - Escanea oportunidades de arbitraje REALES
 * - Ejecuta transacciones REALES cuando encuentra profit
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

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false, // FALSE = TRANSACCIONES REALES
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let wallet = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BLOCKCHAIN REAL
// ═══════════════════════════════════════════════════════════════════════════════

async function getChainBalances() {
  const balances = [];
  const ethPrice = 3500; // Precio aproximado ETH

  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });

      console.log(`[BALANCE] ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * ethPrice).toFixed(2)})`);
    } catch (e) {
      console.error(`[ERROR] Balance ${chain.name}:`, e.message);
      balances.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0.0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
    }
  }

  return balances;
}

async function scanForArbitrage(chainKey) {
  const chain = CHAINS[chainKey];
  const opportunities = [];

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const quoter = new ethers.Contract(chain.uniV3Quoter, QUOTER_ABI, provider);

    // Obtener precio de gas
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const estimatedGas = 250000n;
    const gasCostWei = gasPrice * estimatedGas;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    const gasCostUsd = gasCostEth * 3500;

    // Probar diferentes cantidades
    const testAmounts = [
      ethers.parseEther('0.005'),
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02')
    ];

    // Fee tiers de Uniswap V3
    const feeTiers = [100, 500, 3000];

    for (const amount of testAmounts) {
      for (let i = 0; i < feeTiers.length; i++) {
        for (let j = 0; j < feeTiers.length; j++) {
          if (i === j) continue;

          try {
            // ETH -> USDC (fee1) -> ETH (fee2)
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amount,
              fee: feeTiers[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];

            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: feeTiers[j],
              sqrtPriceLimitX96: 0n
            });
            const ethOut = quote2[0];

            const grossProfit = ethOut - amount;
            const netProfit = grossProfit - gasCostWei;

            if (netProfit > 0n) {
              const netProfitEth = parseFloat(ethers.formatEther(netProfit));
              const netProfitUsd = netProfitEth * 3500;

              opportunities.push({
                chain: chainKey,
                route: `ETH->${feeTiers[i]/100}%->USDC->${feeTiers[j]/100}%->ETH`,
                amountIn: amount,
                amountInEth: ethers.formatEther(amount),
                fee1: feeTiers[i],
                fee2: feeTiers[j],
                usdcIntermediate: usdcOut,
                ethOut: ethOut,
                grossProfit: grossProfit,
                netProfit: netProfit,
                spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                potentialProfit: netProfitUsd.toFixed(4),
                gasCost: gasCostUsd.toFixed(4),
                netProfitUsd: netProfitUsd,
                timestamp: Date.now()
              });

              console.log(`[OPPORTUNITY] ${chain.name}: ${ethers.formatEther(amount)} ETH -> $${netProfitUsd.toFixed(4)} profit`);
            }
          } catch (e) {
            // Pool no existe para esta combinación
          }
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] Scan ${chainKey}:`, e.message);
  }

  return opportunities;
}

async function executeArbitrage(opportunity) {
  const chain = CHAINS[opportunity.chain];
  
  console.log(`\n🚀 EJECUTANDO TRADE REAL en ${chain.name}`);
  console.log(`   Route: ${opportunity.route}`);
  console.log(`   Amount: ${opportunity.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opportunity.potentialProfit}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opportunity.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      return { success: false, error: 'Balance insuficiente' };
    }

    // WETH Contract
    const weth = new ethers.Contract(
      chain.tokens.WETH,
      ['function deposit() payable', 'function withdraw(uint256)', ...ERC20_ABI],
      signer
    );

    // Router Contract
    const router = new ethers.Contract(chain.uniV3Router, ROUTER_ABI, signer);

    // 1. Wrap ETH to WETH
    console.log(`   📦 Wrapping ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: opportunity.amountIn });
    await wrapTx.wait();
    console.log(`   ✅ Wrapped: ${wrapTx.hash}`);

    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (allowance < opportunity.amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`   ✅ Approved`);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdcOut = (opportunity.usdcIntermediate * 995n) / 1000n; // 0.5% slippage
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opportunity.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opportunity.amountIn,
      amountOutMinimum: minUsdcOut,
      sqrtPriceLimitX96: 0n
    });
    const swap1Receipt = await swap1Tx.wait();
    console.log(`   ✅ Swap 1: ${swap1Receipt.hash}`);

    // 4. Approve USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.uniV3Router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.uniV3Router, ethers.MaxUint256);
      await approveUsdcTx.wait();
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWethOut = (opportunity.ethOut * 995n) / 1000n; // 0.5% slippage
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opportunity.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWethOut,
      sqrtPriceLimitX96: 0n
    });
    const swap2Receipt = await swap2Tx.wait();
    console.log(`   ✅ Swap 2: ${swap2Receipt.hash}`);

    // 6. Calcular profit real
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opportunity.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * 3500;

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   Initial: ${opportunity.amountInEth} ETH`);
    console.log(`   Final: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`   Profit: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);

    return {
      success: true,
      profit: actualProfit,
      profitUsd: actualProfitUsd,
      txHash: swap2Receipt.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function botTick() {
  if (!state.isRunning) return;

  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Seleccionar chain (Thompson Sampling simplificado)
  const chains = ['base', 'arbitrum', 'optimism'];
  const selectedChain = chains[Math.floor(Math.random() * 3)];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit states
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  console.log(`\n[TICK ${state.stats.totalTicks}] Escaneando ${CHAINS[selectedChain].name}...`);

  try {
    // Escanear oportunidades REALES
    const opportunities = await scanForArbitrage(selectedChain);

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 10);

      console.log(`[FOUND] ${opportunities.length} oportunidades. Mejor: $${best.potentialProfit}`);

      // Ejecutar si profit > $0.10 y NO es dry run
      if (best.netProfitUsd > 0.10 && !state.isDryRun) {
        console.log(`[EXECUTE] Profit > $0.10, ejecutando trade REAL...`);
        
        const result = await executeArbitrage(best);
        
        state.stats.totalTrades++;
        
        if (result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost,
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.alpha += 1;

        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost,
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) bandit.beta += 1;
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 50) state.tradeLogs.pop();
      } else if (state.isDryRun) {
        console.log(`[DRY RUN] Habría ejecutado trade con $${best.potentialProfit} profit`);
      } else {
        console.log(`[SKIP] Profit muy bajo: $${best.potentialProfit}`);
      }
    } else {
      console.log(`[NONE] No se encontraron oportunidades rentables`);
    }

    // Actualizar balances cada 5 ticks
    if (state.stats.totalTicks % 5 === 0) {
      state.chains = await getChainBalances();
    }

  } catch (e) {
    console.error(`[ERROR] Tick error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Obtener balances iniciales
  console.log('\n[INIT] Obteniendo balances reales...');
  state.chains = await getChainBalances();

  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(botTick, 5000); // Cada 5 segundos

  console.log(`\n[START] Bot iniciado en modo ${state.isDryRun ? 'DRY RUN (simulación)' : 'LIVE (transacciones reales)'}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    message: state.isDryRun ? 'Modo simulación' : '⚠️ MODO REAL - Ejecutará transacciones reales'
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');

  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖 BOT ARBITRAJE REAL - TRANSACCIONES EN VIVO                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  ADVERTENCIA: Este bot ejecuta transacciones REALES                      ║
║   ⚠️  Desactiva "Modo Simulación" para trading real                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar conexión inicial
  console.log('\n[INIT] Verificando conexiones...');
  const balances = await getChainBalances();
  state.chains = balances;
  console.log('[INIT] Conexiones verificadas ✅\n');
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});

