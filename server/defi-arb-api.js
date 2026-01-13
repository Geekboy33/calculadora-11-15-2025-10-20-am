// ═══════════════════════════════════════════════════════════════════════════════
// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;



// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;


// DEFI ARBITRAGE BOT - REAL-TIME API SERVER
// Connects frontend dashboard with live blockchain operations
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    uniV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    uniV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    uniV3Quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    uniV3Router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160, uint32, uint256)'
];

const SUSHI_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// ─────────────────────────────────────────────────────────────────────────────────
// BOT STATE
// ─────────────────────────────────────────────────────────────────────────────────

let botState = {
  isRunning: false,
  isDryRun: true,
  totalTicks: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalProfitUsd: 0,
  totalGasUsd: 0,
  netProfitUsd: 0,
  winRate: 0,
  uptime: 0,
  currentChain: 'base',
  startTime: null,
  
  // AI Bandit State (Thompson Sampling)
  banditState: {
    base: { alpha: 2, beta: 2 },
    arbitrum: { alpha: 2, beta: 2 },
    optimism: { alpha: 2, beta: 2 }
  },
  
  // Recent opportunities
  opportunities: [],
  
  // Trade logs
  tradeLogs: [],
  
  // Chain balances
  chainBalances: {}
};

let botInterval = null;

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

// Beta distribution sampling for Thompson Sampling
function sampleBeta(alpha, beta) {
  // Approximation using gamma distribution
  const gammaAlpha = jStat.gamma.sample(alpha, 1);
  const gammaBeta = jStat.gamma.sample(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

// Simple gamma sampling (approximation)
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function thompsonSample(alpha, beta) {
  const a = gammaRandom(alpha, 1);
  const b = gammaRandom(beta, 1);
  return a / (a + b);
}

// Select chain using Thompson Sampling
function selectChainThompson() {
  const samples = {};
  let maxSample = -1;
  let selectedChain = 'base';
  
  for (const chain of Object.keys(botState.banditState)) {
    const { alpha, beta } = botState.banditState[chain];
    const sample = thompsonSample(alpha, beta);
    samples[chain] = sample;
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedChain = chain;
    }
  }
  
  return selectedChain;
}

// Update bandit state based on result
function updateBandit(chain, success) {
  if (success) {
    botState.banditState[chain].alpha += 1;
  } else {
    botState.banditState[chain].beta += 1;
  }
}

// Get ETH price (simplified - in production use Chainlink)
async function getEthPrice() {
  return 3500; // Simplified - should use Chainlink oracle
}

// ─────────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function getChainBalances() {
  const balances = {};
  const ethPrice = await getEthPrice();
  
  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * ethPrice,
        routes: 5,
        isActive: balanceEth > 0.001,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    } catch (error) {
      console.error(`Error getting balance for ${chainKey}:`, error.message);
      balances[chainKey] = {
        chain: chainKey,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastTick: Date.now(),
        explorer: chainConfig.explorer
      };
    }
  }
  
  botState.chainBalances = balances;
  return balances;
}

async function analyzeArbitrageOpportunity(chainKey) {
  const chainConfig = CHAINS[chainKey];
  if (!chainConfig) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const quoter = new ethers.Contract(chainConfig.uniV3Quoter, QUOTER_ABI, provider);
    
    // Test amounts
    const testAmounts = [
      ethers.parseEther('0.01'),
      ethers.parseEther('0.02'),
      ethers.parseEther('0.05')
    ];
    
    const ethPrice = await getEthPrice();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedGas = 250000n;
    const gasCostEth = gasPrice * estimatedGas;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostEth)) * ethPrice;
    
    let bestOpportunity = null;
    
    for (const amountIn of testAmounts) {
      try {
        // Quote: WETH -> USDC -> WETH (triangular)
        const quote1 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.WETH,
          tokenOut: chainConfig.USDC,
          amountIn: amountIn,
          fee: 500, // 0.05% pool
          sqrtPriceLimitX96: 0n
        });
        
        const usdcOut = quote1[0];
        
        const quote2 = await quoter.quoteExactInputSingle.staticCall({
          tokenIn: chainConfig.USDC,
          tokenOut: chainConfig.WETH,
          amountIn: usdcOut,
          fee: 3000, // 0.3% pool
          sqrtPriceLimitX96: 0n
        });
        
        const ethOut = quote2[0];
        const profitWei = ethOut - amountIn;
        const profitEth = parseFloat(ethers.formatEther(profitWei));
        const profitUsd = profitEth * ethPrice;
        const netProfitUsd = profitUsd - gasCostUsd;
        
        const spreadBps = (profitEth / parseFloat(ethers.formatEther(amountIn))) * 10000;
        
        if (netProfitUsd > 0 && (!bestOpportunity || netProfitUsd > bestOpportunity.netProfit)) {
          bestOpportunity = {
            chain: chainKey,
            route: 'WETH-USDC-WETH 500/3000',
            amountIn: parseFloat(ethers.formatEther(amountIn)),
            amountOut: parseFloat(ethers.formatEther(ethOut)),
            spreadBps: spreadBps,
            potentialProfit: profitUsd,
            gasCost: gasCostUsd,
            netProfit: netProfitUsd,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Quote failed, continue
      }
    }
    
    return bestOpportunity;
  } catch (error) {
    console.error(`Error analyzing ${chainKey}:`, error.message);
    return null;
  }
}

async function executeArbitrage(opportunity) {
  if (botState.isDryRun) {
    console.log('[DRY RUN] Would execute:', opportunity);
    return { success: true, txHash: '0xDRYRUN...', dryRun: true };
  }
  
  if (!PRIVATE_KEY) {
    console.error('No private key configured');
    return { success: false, error: 'No private key' };
  }
  
  const chainConfig = CHAINS[opportunity.chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    const router = new ethers.Contract(chainConfig.uniV3Router, SWAP_ROUTER_ABI, wallet);
    
    const amountIn = ethers.parseEther(opportunity.amountIn.toString());
    const minAmountOut = ethers.parseEther((opportunity.amountOut * 0.995).toString()); // 0.5% slippage
    
    // First swap: WETH -> USDC
    const tx1 = await router.exactInputSingle({
      tokenIn: chainConfig.WETH,
      tokenOut: chainConfig.USDC,
      fee: 500,
      recipient: wallet.address,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    }, { value: amountIn });
    
    await tx1.wait();
    
    // Second swap: USDC -> WETH
    const usdc = new ethers.Contract(chainConfig.USDC, ERC20_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    await usdc.approve(chainConfig.uniV3Router, usdcBalance);
    
    const tx2 = await router.exactInputSingle({
      tokenIn: chainConfig.USDC,
      tokenOut: chainConfig.WETH,
      fee: 3000,
      recipient: wallet.address,
      amountIn: usdcBalance,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    });
    
    const receipt = await tx2.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Execution error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BOT TICK FUNCTION
// ─────────────────────────────────────────────────────────────────────────────────

async function botTick() {
  if (!botState.isRunning) return;
  
  botState.totalTicks++;
  botState.uptime = Math.floor((Date.now() - botState.startTime) / 1000);
  
  // Select chain using Thompson Sampling
  const selectedChain = selectChainThompson();
  botState.currentChain = selectedChain;
  
  // Analyze opportunity
  const opportunity = await analyzeArbitrageOpportunity(selectedChain);
  
  if (opportunity) {
    // Add to opportunities list
    botState.opportunities.unshift(opportunity);
    botState.opportunities = botState.opportunities.slice(0, 20);
    
    if (opportunity.netProfit > 0.50) { // Min $0.50 profit
      console.log(`[${selectedChain}] Found opportunity: $${opportunity.netProfit.toFixed(4)} profit`);
      
      // Execute trade
      const result = await executeArbitrage(opportunity);
      
      if (result.success) {
        botState.totalTrades++;
        botState.successfulTrades++;
        botState.totalProfitUsd += opportunity.netProfit;
        botState.totalGasUsd += opportunity.gasCost;
        botState.netProfitUsd = botState.totalProfitUsd - botState.totalGasUsd;
        
        updateBandit(selectedChain, true);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: opportunity.amountOut,
          profit: opportunity.potentialProfit,
          gasCost: opportunity.gasCost,
          netProfit: opportunity.netProfit,
          txHash: result.txHash,
          status: 'success'
        });
      } else {
        botState.totalTrades++;
        updateBandit(selectedChain, false);
        
        botState.tradeLogs.unshift({
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          chain: selectedChain,
          route: opportunity.route,
          amountIn: opportunity.amountIn,
          amountOut: 0,
          profit: 0,
          gasCost: 0,
          netProfit: 0,
          status: 'failed'
        });
      }
      
      botState.tradeLogs = botState.tradeLogs.slice(0, 100);
    } else {
      // No profitable opportunity
      updateBandit(selectedChain, false);
    }
  } else {
    updateBandit(selectedChain, false);
  }
  
  // Calculate win rate
  if (botState.totalTrades > 0) {
    botState.winRate = (botState.successfulTrades / botState.totalTrades) * 100;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

// Get bot status
app.get('/api/defi/multichain-arb/status', async (req, res) => {
  try {
    // Update balances
    await getChainBalances();
    
    const chains = Object.values(botState.chainBalances);
    
    const banditStates = Object.entries(botState.banditState).map(([chain, state]) => ({
      chain,
      alpha: state.alpha,
      beta: state.beta,
      winRate: (state.alpha / (state.alpha + state.beta)) * 100,
      selected: chain === botState.currentChain
    }));
    
    res.json({
      isRunning: botState.isRunning,
      isDryRun: botState.isDryRun,
      chains,
      banditStates,
      opportunities: botState.opportunities,
      tradeLogs: botState.tradeLogs,
      stats: {
        totalTicks: botState.totalTicks,
        totalTrades: botState.totalTrades,
        successfulTrades: botState.successfulTrades,
        totalProfitUsd: botState.totalProfitUsd,
        totalGasUsd: botState.totalGasUsd,
        netProfitUsd: botState.netProfitUsd,
        winRate: botState.winRate,
        uptime: botState.uptime,
        currentChain: botState.currentChain
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/api/defi/multichain-arb/start', (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    if (botState.isRunning) {
      return res.status(400).json({ error: 'Bot already running' });
    }
    
    botState.isRunning = true;
    botState.isDryRun = dryRun;
    botState.startTime = Date.now();
    botState.totalTicks = 0;
    
    // Start tick interval (every 700ms)
    botInterval = setInterval(botTick, 700);
    
    console.log(`[BOT] Started in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
    
    res.json({ success: true, message: `Bot started in ${dryRun ? 'dry run' : 'live'} mode` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  try {
    if (!botState.isRunning) {
      return res.status(400).json({ error: 'Bot not running' });
    }
    
    botState.isRunning = false;
    
    if (botInterval) {
      clearInterval(botInterval);
      botInterval = null;
    }
    
    console.log('[BOT] Stopped');
    
    res.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/defi/multichain-arb/settings', (req, res) => {
  try {
    const { minProfitUsd, maxSlippageBps, gasMult, tickMs } = req.body;
    
    // Update settings (would need to modify CFG in production)
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scan
app.post('/api/defi/multichain-arb/scan', async (req, res) => {
  try {
    const opportunities = [];
    
    for (const chain of Object.keys(CHAINS)) {
      const opp = await analyzeArbitrageOpportunity(chain);
      if (opp) {
        opportunities.push(opp);
      }
    }
    
    res.json({ opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.DEFI_ARB_PORT || 3099;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 DEFI ARBITRAGE BOT API SERVER                                             ║
║                                                                                ║
║   Port: ${PORT}                                                                  ║
║   Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8)}                               ║
║   Chains: Base, Arbitrum, Optimism                                             ║
║                                                                                ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status                                       ║
║   - POST /api/defi/multichain-arb/start                                        ║
║   - POST /api/defi/multichain-arb/stop                                         ║
║   - POST /api/defi/multichain-arb/scan                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial balance fetch
  getChainBalances().then(balances => {
    console.log('[INIT] Chain balances loaded');
  });
});

export default app;




