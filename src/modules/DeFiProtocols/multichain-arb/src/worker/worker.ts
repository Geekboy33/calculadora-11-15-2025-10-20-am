// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - WORKER
// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// The Worker is responsible for a single chain:
// - Scanning for opportunities
// - Validating candidates
// - Executing trades
// - Recording metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { CFG, ChainKey } from "../config.js";
import { insertMetric, insertTrade, updateTradeStatus } from "../db.js";
import { logWorker } from "../logger.js";
import { findCandidate, validateCandidate, Candidate } from "./strategy.js";
import { Executor, DryRunExecutor, ExecutionResult } from "./executor.js";
import { Route } from "../dex/routes.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkerConfig {
  chain: ChainKey;
  providerRead: JsonRpcProvider;
  providerSim: JsonRpcProvider;
  providerSend: JsonRpcProvider;
  ws?: WebSocketProvider;
  routes: Route[];
  sizes: bigint[];
  stableDecimals: number;
  executorAddress?: string;
}

export interface TickResult {
  success: boolean;
  found: boolean;
  executed: boolean;
  profitNetUsd: number;
  gasUsd: number;
  latencyMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WORKER CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Worker {
  private cfg: WorkerConfig;
  private executor: Executor;
  private isRunning: boolean = false;
  private lastTick: number = 0;
  private tickCount: number = 0;
  private successCount: number = 0;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;

    // Use dry run executor if in dry run mode or no executor address
    if (CFG.DRY_RUN || !cfg.executorAddress) {
      this.executor = new DryRunExecutor(cfg.chain, cfg.providerSend);
      logWorker.info({ chain: cfg.chain }, "Worker initialized in DRY RUN mode");
    } else {
      this.executor = new Executor(cfg.chain, cfg.providerSend);
      this.executor.setExecutorAddress(cfg.executorAddress);
      logWorker.info({ chain: cfg.chain, executor: cfg.executorAddress }, "Worker initialized");
    }
  }

  /**
   * Get the chain this worker is responsible for
   */
  getChain(): ChainKey {
    return this.cfg.chain;
  }

  /**
   * Get worker statistics
   */
  getStats(): { tickCount: number; successCount: number; successRate: number } {
    return {
      tickCount: this.tickCount,
      successCount: this.successCount,
      successRate: this.tickCount > 0 ? (this.successCount / this.tickCount) * 100 : 0
    };
  }

  /**
   * Execute one tick (scan + potentially execute)
   */
  async tick(): Promise<TickResult> {
    const t0 = Date.now();
    this.tickCount++;

    try {
      // Find candidate
      const result = await findCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        routes: this.cfg.routes,
        sizes: this.cfg.sizes,
        stableDecimals: this.cfg.stableDecimals
      });

      const latencyMs = Date.now() - t0;

      if (!result.found || !result.candidate) {
        // No opportunity found
        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: 0,
          success: true,
          latencyMs
        });

        return {
          success: true,
          found: false,
          executed: false,
          profitNetUsd: 0,
          gasUsd: 0,
          latencyMs
        };
      }

      const candidate = result.candidate;

      // Validate candidate before execution
      const validation = await validateCandidate({
        chain: this.cfg.chain,
        providerSim: this.cfg.providerSim,
        candidate,
        stableDecimals: this.cfg.stableDecimals,
        maxSlippageBps: CFG.MAX_SLIPPAGE_BPS
      });

      if (!validation.valid) {
        logWorker.warn({
          chain: this.cfg.chain,
          reason: validation.reason
        }, "Candidate validation failed");

        insertMetric({
          chain: this.cfg.chain,
          profitUsd: 0,
          gasUsd: candidate.gasUsd,
          success: false,
          latencyMs
        });

        return {
          success: false,
          found: true,
          executed: false,
          profitNetUsd: 0,
          gasUsd: candidate.gasUsd,
          latencyMs,
          error: validation.reason
        };
      }

      const validatedCandidate = validation.updatedCandidate ?? candidate;

      // Record pending trade
      const tradeId = `${this.cfg.chain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertTrade({
        id: tradeId,
        chain: this.cfg.chain,
        routeName: validatedCandidate.routeName,
        amountIn: validatedCandidate.amountIn.toString(),
        amountOut: validatedCandidate.amountOut.toString(),
        profitUsd: validatedCandidate.profitNetUsd,
        gasUsd: validatedCandidate.gasUsd,
        status: "pending"
      });

      // Execute trade
      const execResult = await this.executor.executeArbitrage(validatedCandidate);

      // Update trade status
      updateTradeStatus(
        tradeId,
        execResult.success ? "confirmed" : "failed",
        execResult.txHash
      );

      // Record metric
      insertMetric({
        chain: this.cfg.chain,
        profitUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        success: execResult.success,
        latencyMs: Date.now() - t0
      });

      if (execResult.success) {
        this.successCount++;

        logWorker.info({
          chain: this.cfg.chain,
          route: validatedCandidate.routeName,
          profitNet: validatedCandidate.profitNetUsd.toFixed(4),
          txHash: execResult.txHash,
          explorer: this.executor.getExplorerUrl(execResult.txHash!)
        }, "Trade executed successfully");
      }

      return {
        success: execResult.success,
        found: true,
        executed: true,
        profitNetUsd: execResult.success ? validatedCandidate.profitNetUsd : 0,
        gasUsd: validatedCandidate.gasUsd,
        latencyMs: Date.now() - t0,
        error: execResult.error
      };

    } catch (error: any) {
      const latencyMs = Date.now() - t0;

      logWorker.error({
        chain: this.cfg.chain,
        error: error.message
      }, "Tick error");

      insertMetric({
        chain: this.cfg.chain,
        profitUsd: 0,
        gasUsd: 0,
        success: false,
        latencyMs
      });

      return {
        success: false,
        found: false,
        executed: false,
        profitNetUsd: 0,
        gasUsd: 0,
        latencyMs,
        error: error.message
      };
    }
  }

  /**
   * Start continuous operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logWorker.warn({ chain: this.cfg.chain }, "Worker already running");
      return;
    }

    this.isRunning = true;
    logWorker.info({ chain: this.cfg.chain }, "Worker started");

    while (this.isRunning) {
      await this.tick();
      await this.sleep(CFG.TICK_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    logWorker.info({ chain: this.cfg.chain }, "Worker stopped");
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.executor.getWalletAddress();
  }

  /**
   * Get native balance
   */
  async getNativeBalance(): Promise<bigint> {
    return this.executor.getNativeBalance();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    return this.executor.getBalance(tokenAddress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
