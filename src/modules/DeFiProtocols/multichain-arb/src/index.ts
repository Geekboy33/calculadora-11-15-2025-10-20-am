// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - MAIN CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});



// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-powered chain rotation with Thompson Sampling (Multi-Armed Bandit)

import { JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import { CFG, RPCS, ChainKey, CHAIN_INFO } from "./config.js";
import { log } from "./logger.js";
import { Bandit } from "./ai/bandit.js";
import { Worker } from "./worker/worker.js";
import { ROUTES_BY_CHAIN } from "./dex/routes.js";
import { insertMetric, getAllChainStats } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────────
// WEBSOCKET PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────────

function createWsProvider(url: string): WebSocketProvider | null {
  try {
    return new WebSocketProvider(url);
  } catch (error) {
    log.warn({ url }, "WebSocket connection failed, continuing without WS");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE SIZE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────────

function sizesStable(decimals: number): bigint[] {
  // USD sizes: 25, 50, 100, 250, 500, 1000
  return CFG.TRADE_SIZES_USD.map(v => BigInt(v) * 10n ** BigInt(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 MULTI-CHAIN MICRO ARBITRAGE BOT                                           ║
║   AI-Powered Chain Rotation (Thompson Sampling)                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const chains = CFG.CHAINS;
  log.info({ chains, dryRun: CFG.DRY_RUN }, "Initializing bot");

  // Create wallet
  const wallet = new Wallet(CFG.PRIVATE_KEY);
  log.info({ address: wallet.address }, "Wallet loaded");

  // Initialize AI Bandit for chain rotation
  const bandit = new Bandit(chains);
  log.info("AI Bandit initialized (Thompson Sampling)");

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE WORKERS FOR EACH CHAIN
  // ═══════════════════════════════════════════════════════════════════════════════

  const workers = new Map<string, Worker>();

  for (const chain of chains) {
    const rpc = RPCS[chain];
    const info = CHAIN_INFO[chain];
    const routes = ROUTES_BY_CHAIN[chain] || [];

    log.info({ chain: info.name, routes: routes.length }, "Setting up worker");

    try {
      const providerRead = new JsonRpcProvider(rpc.read);
      const providerSim = new JsonRpcProvider(rpc.sim);
      const providerSend = new JsonRpcProvider(rpc.send);
      const ws = createWsProvider(rpc.ws);

      // Verify connection
      const network = await providerRead.getNetwork();
      const balance = await providerRead.getBalance(wallet.address);
      
      log.info({
        chain: info.name,
        chainId: Number(network.chainId),
        balance: (Number(balance) / 1e18).toFixed(6)
      }, "Chain connected");

      // Create worker
      const stableDecimals = 6; // USDC has 6 decimals

      workers.set(chain, new Worker({
        chain,
        providerRead,
        providerSim,
        providerSend,
        ws: ws as WebSocketProvider,
        routes,
        sizes: sizesStable(stableDecimals),
        stableDecimals
      }));

    } catch (error: any) {
      log.error({ chain, error: error.message }, "Failed to setup worker");
    }
  }

  if (workers.size === 0) {
    log.error("No workers initialized, exiting");
    process.exit(1);
  }

  log.info({ workers: workers.size }, "All workers initialized");

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  let currentChain = bandit.chooseChain();
  let nextDecision = Date.now() + CFG.DECISION_MS;
  let tickCount = 0;

  log.info({ currentChain }, "Starting main loop");

  console.log(`
${"═".repeat(70)}
📊 BOT STATUS
${"═".repeat(70)}

  Mode: ${CFG.DRY_RUN ? "🔒 DRY RUN (simulation only)" : "🔴 LIVE TRADING"}
  Chains: ${chains.join(", ")}
  Trade sizes: $${CFG.TRADE_SIZES_USD.join(", $")}
  Min profit: $${CFG.MIN_PROFIT_USD}
  Current chain: ${currentChain}

${"═".repeat(70)}
  `);

  // Main loop
  while (true) {
    const now = Date.now();
    tickCount++;

    // ─────────────────────────────────────────────────────────────────────────────
    // AI CHAIN ROTATION
    // ─────────────────────────────────────────────────────────────────────────────

    if (now >= nextDecision) {
      const previousChain = currentChain;
      currentChain = bandit.chooseChain();
      nextDecision = now + CFG.DECISION_MS;

      if (currentChain !== previousChain) {
        log.info({ from: previousChain, to: currentChain }, "🔄 AI rotated chain");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE TICK ON CURRENT CHAIN
    // ─────────────────────────────────────────────────────────────────────────────

    const worker = workers.get(currentChain);
    
    if (worker) {
      try {
        const result = await worker.tick();

        // Update AI bandit with result
        const success = result.profitNetUsd > 0 && result.latencyMs < 1500;
        bandit.update(currentChain, success);

        // Log progress every 10 ticks
        if (tickCount % 10 === 0) {
          const stats = getAllChainStats();
          const totalProfit = stats.reduce((sum, s) => sum + s.netProfitUsd, 0);
          
          process.stdout.write(`\r  [${new Date().toLocaleTimeString()}] Chain: ${currentChain} | Ticks: ${tickCount} | Net profit: $${totalProfit.toFixed(4)}    `);
        }

        // If profitable opportunity found
        if (result.profitNetUsd > CFG.MIN_PROFIT_USD) {
          log.info({
            chain: currentChain,
            profit: result.profitNetUsd.toFixed(4),
            gas: result.gasUsd.toFixed(4)
          }, "💰 Profitable opportunity found!");

          if (!CFG.DRY_RUN) {
            // TODO: Execute trade via ArbExecutor contract
            log.info("Would execute trade here (not implemented yet)");
          }
        }

      } catch (error: any) {
        log.error({ chain: currentChain, error: error.message }, "Worker tick error");
        bandit.update(currentChain, false);
      }
    }

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CFG.TICK_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

main().catch(error => {
  log.error(error, "Fatal error");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...\n");
  
  const stats = getAllChainStats();
  console.log("📊 Final Statistics:");
  for (const stat of stats) {
    console.log(`  ${stat.chain}: ${stat.totalTrades} trades, $${stat.netProfitUsd.toFixed(4)} net profit`);
  }
  
  process.exit(0);
});
