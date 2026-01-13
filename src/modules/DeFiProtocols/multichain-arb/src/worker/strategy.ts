// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Implements the core arbitrage strategy:
// 1. Quote all routes with multiple sizes
// 2. Calculate profit after gas
// 3. Filter by minimum profit threshold
// 4. Return best candidate
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { simulateArbitrage, SimulationResult } from "./simulator.js";
import { gasToUsd } from "../oracle/price.js";
import { Route } from "../dex/routes.js";
import { logWorker } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface Candidate {
  routeName: string;
  route: Route;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  profitBps: number;
  profitUsd: number;
  profitNetUsd: number;
  gasUsd: number;
  gasEstimate: bigint;
  score: number;  // Combined score for ranking
}

export interface StrategyResult {
  found: boolean;
  candidate: Candidate | null;
  candidates: Candidate[];
  scannedRoutes: number;
  scannedSizes: number;
  scanTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// STRATEGY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Find the best arbitrage candidate across all routes and sizes
 */
export async function findCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
}): Promise<StrategyResult> {
  const startTime = Date.now();
  const { chain, providerSim, routes, sizes, stableDecimals } = params;

  const candidates: Candidate[] = [];
  let scannedRoutes = 0;
  let scannedSizes = 0;

  // Get current gas price
  const feeData = await providerSim.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? 0n;

  // Proxy gas estimate for 2 swaps on L2
  const GAS_PROXY: Record<ChainKey, bigint> = {
    base: 260000n,
    arbitrum: 280000n,
    optimism: 260000n,
    polygon: 300000n
  };

  for (const route of routes) {
    scannedRoutes++;

    for (const amountIn of sizes) {
      scannedSizes++;

      try {
        // Simulate the arbitrage
        const sim = await simulateArbitrage({
          provider: providerSim,
          route,
          amountIn
        });

        if (!sim.success || sim.amountOut <= amountIn) {
          continue;
        }

        // Calculate USD values
        const inUsd = Number(amountIn) / (10 ** stableDecimals);
        const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
        const profitUsd = outUsd - inUsd;

        // Calculate gas cost in USD
        const gasEstimate = sim.gasEstimate > 0n ? sim.gasEstimate : GAS_PROXY[chain];
        const gasUsd = await gasToUsd({
          chain,
          provider: providerSim,
          gasUsed: gasEstimate,
          gasPriceWei
        });

        // Net profit after gas
        const profitNetUsd = profitUsd - gasUsd;

        // Check minimum profit threshold
        const minProfit = Math.max(CFG.MIN_PROFIT_USD, gasUsd * CFG.GAS_MULT);
        if (profitNetUsd < minProfit) {
          continue;
        }

        // Calculate score (higher is better)
        // Score = net profit * (1 + profit_bps/100) to favor higher % returns
        const score = profitNetUsd * (1 + sim.profitBps / 100);

        const candidate: Candidate = {
          routeName: route.name,
          route,
          amountIn,
          amountOut: sim.amountOut,
          midAmount: sim.midAmount,
          profitBps: sim.profitBps,
          profitUsd,
          profitNetUsd,
          gasUsd,
          gasEstimate,
          score
        };

        candidates.push(candidate);

        logWorker.debug({
          route: route.name,
          amountIn: inUsd.toFixed(2),
          profitNet: profitNetUsd.toFixed(4),
          profitBps: sim.profitBps
        }, "Candidate found");

      } catch (error: any) {
        logWorker.debug({
          route: route.name,
          amountIn: amountIn.toString(),
          error: error.message
        }, "Route scan error");
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length > 0 ? candidates[0] : null;

  if (best) {
    logWorker.info({
      chain,
      route: best.routeName,
      amountIn: (Number(best.amountIn) / (10 ** stableDecimals)).toFixed(2),
      profitNet: best.profitNetUsd.toFixed(4),
      profitBps: best.profitBps,
      gasUsd: best.gasUsd.toFixed(4),
      candidates: candidates.length,
      scanTimeMs
    }, "Best candidate selected");
  }

  return {
    found: candidates.length > 0,
    candidate: best,
    candidates,
    scannedRoutes,
    scannedSizes,
    scanTimeMs
  };
}

/**
 * Quick scan for any profitable opportunity (faster, less thorough)
 */
export async function quickScan(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  routes: Route[];
  defaultSize: bigint;
  stableDecimals: number;
}): Promise<{ found: boolean; route?: Route; profitBps?: number }> {
  const { chain, providerSim, routes, defaultSize, stableDecimals } = params;

  for (const route of routes) {
    try {
      const sim = await simulateArbitrage({
        provider: providerSim,
        route,
        amountIn: defaultSize
      });

      if (sim.success && sim.profitBps > 0) {
        return { found: true, route, profitBps: sim.profitBps };
      }
    } catch {
      continue;
    }
  }

  return { found: false };
}

/**
 * Validate a candidate before execution
 */
export async function validateCandidate(params: {
  chain: ChainKey;
  providerSim: JsonRpcProvider;
  candidate: Candidate;
  stableDecimals: number;
  maxSlippageBps: number;
}): Promise<{ valid: boolean; reason?: string; updatedCandidate?: Candidate }> {
  const { chain, providerSim, candidate, stableDecimals, maxSlippageBps } = params;

  try {
    // Re-simulate to get fresh quote
    const sim = await simulateArbitrage({
      provider: providerSim,
      route: candidate.route,
      amountIn: candidate.amountIn
    });

    if (!sim.success) {
      return { valid: false, reason: "Simulation failed on re-check" };
    }

    // Check if output changed significantly
    const slippageBps = Number((candidate.amountOut - sim.amountOut) * 10000n / candidate.amountOut);
    if (slippageBps > maxSlippageBps) {
      return { valid: false, reason: `Slippage too high: ${slippageBps} bps` };
    }

    // Check if still profitable
    const feeData = await providerSim.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? 0n;
    const gasUsd = await gasToUsd({
      chain,
      provider: providerSim,
      gasUsed: sim.gasEstimate,
      gasPriceWei
    });

    const inUsd = Number(candidate.amountIn) / (10 ** stableDecimals);
    const outUsd = Number(sim.amountOut) / (10 ** stableDecimals);
    const profitNetUsd = (outUsd - inUsd) - gasUsd;

    if (profitNetUsd < CFG.MIN_PROFIT_USD) {
      return { valid: false, reason: `Profit too low: $${profitNetUsd.toFixed(4)}` };
    }

    // Update candidate with fresh values
    const updatedCandidate: Candidate = {
      ...candidate,
      amountOut: sim.amountOut,
      midAmount: sim.midAmount,
      profitBps: sim.profitBps,
      profitUsd: outUsd - inUsd,
      profitNetUsd,
      gasUsd,
      gasEstimate: sim.gasEstimate
    };

    return { valid: true, updatedCandidate };

  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}

