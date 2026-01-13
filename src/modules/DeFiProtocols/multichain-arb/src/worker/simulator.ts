// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Simulates trades using eth_call to validate profitability before execution
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, Contract } from "ethers";
import { encodeV3Path, quoteExactInput } from "../dex/univ3.js";
import { logWorker } from "../logger.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  amountIn: bigint;
  amountOut: bigint;
  midAmount: bigint;
  gasEstimate: bigint;
  profitBps: number;  // Profit in basis points
  error?: string;
}

export interface MultiHopQuote {
  leg1AmountOut: bigint;
  leg2AmountOut: bigint;
  totalGasEstimate: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SIMULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a two-leg arbitrage trade
 */
export async function simulateArbitrage(params: {
  provider: JsonRpcProvider;
  route: Route;
  amountIn: bigint;
}): Promise<SimulationResult> {
  const { provider, route, amountIn } = params;

  try {
    // Leg 1: tokenIn -> tokenMid
    const leg1 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenIn, route.tokenMid],
      fees: [route.fee1],
      amountIn
    });

    if (leg1.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: 0n,
        gasEstimate: 0n,
        profitBps: 0,
        error: "Leg 1 returned zero"
      };
    }

    // Leg 2: tokenMid -> tokenOut
    const leg2 = await quoteExactInput({
      provider,
      quoterV2: route.quoterV2,
      tokens: [route.tokenMid, route.tokenOut],
      fees: [route.fee2],
      amountIn: leg1.amountOut
    });

    if (leg2.amountOut === 0n) {
      return {
        success: false,
        amountIn,
        amountOut: 0n,
        midAmount: leg1.amountOut,
        gasEstimate: leg1.gasEstimate,
        profitBps: 0,
        error: "Leg 2 returned zero"
      };
    }

    // Calculate profit in basis points
    // profitBps = ((amountOut - amountIn) / amountIn) * 10000
    const profitBps = Number((leg2.amountOut - amountIn) * 10000n / amountIn);

    const totalGasEstimate = leg1.gasEstimate + leg2.gasEstimate;

    logWorker.debug({
      route: route.name,
      amountIn: amountIn.toString(),
      midAmount: leg1.amountOut.toString(),
      amountOut: leg2.amountOut.toString(),
      profitBps
    }, "Simulation completed");

    return {
      success: true,
      amountIn,
      amountOut: leg2.amountOut,
      midAmount: leg1.amountOut,
      gasEstimate: totalGasEstimate,
      profitBps
    };

  } catch (error: any) {
    logWorker.error({
      route: route.name,
      error: error.message
    }, "Simulation failed");

    return {
      success: false,
      amountIn,
      amountOut: 0n,
      midAmount: 0n,
      gasEstimate: 0n,
      profitBps: 0,
      error: error.message
    };
  }
}

/**
 * Simulate execution of the actual swap contract
 */
export async function simulateExecution(params: {
  provider: JsonRpcProvider;
  executorAddress: string;
  path1: string;
  path2: string;
  amountIn: bigint;
  minOut: bigint;
  from: string;
}): Promise<{ success: boolean; amountOut: bigint; gasEstimate: bigint; error?: string }> {
  const EXECUTOR_ABI = [
    "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)"
  ];

  try {
    const executor = new Contract(params.executorAddress, EXECUTOR_ABI, params.provider);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    // Use staticCall to simulate without executing
    const amountOut = await executor.execute.staticCall(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    // Estimate gas
    const gasEstimate = await executor.execute.estimateGas(
      params.path1,
      params.path2,
      params.amountIn,
      params.minOut,
      deadline,
      { from: params.from }
    );

    return {
      success: true,
      amountOut: BigInt(amountOut),
      gasEstimate: BigInt(gasEstimate)
    };

  } catch (error: any) {
    return {
      success: false,
      amountOut: 0n,
      gasEstimate: 0n,
      error: error.message
    };
  }
}

/**
 * Batch simulate multiple routes
 */
export async function batchSimulate(params: {
  provider: JsonRpcProvider;
  routes: Route[];
  amounts: bigint[];
}): Promise<Map<string, SimulationResult[]>> {
  const results = new Map<string, SimulationResult[]>();

  // Run simulations in parallel for each route
  const promises = params.routes.map(async route => {
    const routeResults: SimulationResult[] = [];

    for (const amount of params.amounts) {
      const result = await simulateArbitrage({
        provider: params.provider,
        route,
        amountIn: amount
      });
      routeResults.push(result);
    }

    return { routeName: route.name, results: routeResults };
  });

  const allResults = await Promise.all(promises);

  for (const { routeName, results: routeResults } of allResults) {
    results.set(routeName, routeResults);
  }

  return results;
}

/**
 * Find the optimal amount for a route
 */
export async function findOptimalAmount(params: {
  provider: JsonRpcProvider;
  route: Route;
  minAmount: bigint;
  maxAmount: bigint;
  steps: number;
}): Promise<{ optimalAmount: bigint; maxProfit: SimulationResult } | null> {
  const { provider, route, minAmount, maxAmount, steps } = params;

  const stepSize = (maxAmount - minAmount) / BigInt(steps);
  let bestResult: SimulationResult | null = null;
  let optimalAmount = minAmount;

  for (let i = 0; i <= steps; i++) {
    const amount = minAmount + stepSize * BigInt(i);
    const result = await simulateArbitrage({ provider, route, amountIn: amount });

    if (result.success && result.profitBps > (bestResult?.profitBps ?? 0)) {
      bestResult = result;
      optimalAmount = amount;
    }
  }

  if (!bestResult || bestResult.profitBps <= 0) {
    return null;
  }

  return { optimalAmount, maxProfit: bestResult };
}

