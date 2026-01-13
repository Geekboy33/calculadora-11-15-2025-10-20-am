// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - AI BANDIT (Thompson Sampling)
// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// This implements a Multi-Armed Bandit algorithm using Thompson Sampling
// to intelligently rotate between chains based on their performance.
//
// The algorithm learns which chain provides the best risk-adjusted returns
// and allocates more "attention" to profitable chains while still exploring.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db.js";
import { logAI } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────
interface BanditArm {
  chain: string;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

interface BanditDecision {
  chain: string;
  sampledValue: number;
  confidence: number;
  explorationRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────
function getArms(chains: string[]): BanditArm[] {
  const rows = db.prepare(`SELECT chain, alpha, beta FROM bandit_state`).all() as BanditArm[];
  const map = new Map(rows.map(r => [r.chain, r]));

  // Return arms for all chains, using defaults for new ones
  return chains.map(c => map.get(c) ?? { chain: c, alpha: 2, beta: 2 });
}

function upsertArm(a: BanditArm): void {
  db.prepare(`
    INSERT INTO bandit_state(chain, alpha, beta, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(chain) DO UPDATE SET
      alpha = excluded.alpha,
      beta = excluded.beta,
      updated_at = excluded.updated_at
  `).run(a.chain, a.alpha, a.beta, Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random sample from Gamma distribution using Marsaglia and Tsang's method
 */
function randGamma(shape: number): number {
  if (shape < 1) {
    return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Generate a random sample from standard Normal distribution using Box-Muller transform
 */
function normal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Sample from Beta(alpha, beta) distribution
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = randGamma(alpha);
  const y = randGamma(beta);
  return x / (x + y);
}

/**
 * Calculate confidence interval width (uncertainty measure)
 */
function confidenceWidth(alpha: number, beta: number): number {
  // Approximate 95% CI width using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return 1.96 * Math.sqrt(variance);
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT CLASS
// ─────────────────────────────────────────────────────────────────────────────────
export class Bandit {
  private chains: string[];
  private decisionHistory: BanditDecision[] = [];

  constructor(chains: string[]) {
    this.chains = chains;
    logAI.info({ chains }, "Bandit initialized");
  }

  /**
   * Choose the best chain using Thompson Sampling
   */
  chooseChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0].chain;
    let bestScore = -1;
    const samples: { chain: string; value: number }[] = [];

    for (const arm of arms) {
      const sampledValue = sampleBeta(arm.alpha, arm.beta);
      samples.push({ chain: arm.chain, value: sampledValue });

      if (sampledValue > bestScore) {
        bestScore = sampledValue;
        best = arm.chain;
      }
    }

    // Calculate exploration ratio (how uncertain we are)
    const avgConfidence = arms.reduce((sum, a) =>
      sum + (1 - confidenceWidth(a.alpha, a.beta)), 0) / arms.length;

    const decision: BanditDecision = {
      chain: best,
      sampledValue: bestScore,
      confidence: avgConfidence,
      explorationRatio: 1 - avgConfidence
    };

    this.decisionHistory.push(decision);

    logAI.debug({
      chosen: best,
      samples: samples.map(s => `${s.chain}:${s.value.toFixed(3)}`).join(", "),
      confidence: avgConfidence.toFixed(3)
    }, "Chain selected");

    return best;
  }

  /**
   * Update the bandit with the result of an action
   * @param chain - The chain that was used
   * @param success - Whether the trade was profitable
   * @param reward - Optional: magnitude of reward (for weighted updates)
   */
  update(chain: string, success: boolean, reward?: number): void {
    const arms = getArms(this.chains);
    const arm = arms.find(a => a.chain === chain);
    if (!arm) return;

    // Standard Thompson Sampling update
    if (success) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    // Optional: weighted update based on reward magnitude
    if (reward !== undefined && reward > 0) {
      // Add extra alpha proportional to reward (capped)
      const extraAlpha = Math.min(reward / 10, 0.5);
      arm.alpha += extraAlpha;
    }

    upsertArm(arm);

    logAI.info({
      chain,
      success,
      reward: reward?.toFixed(2),
      newAlpha: arm.alpha.toFixed(2),
      newBeta: arm.beta.toFixed(2),
      estimatedWinRate: (arm.alpha / (arm.alpha + arm.beta) * 100).toFixed(1) + "%"
    }, "Bandit updated");
  }

  /**
   * Get current state of all arms
   */
  getState(): Array<{
    chain: string;
    alpha: number;
    beta: number;
    estimatedWinRate: number;
    confidence: number;
  }> {
    const arms = getArms(this.chains);
    return arms.map(a => ({
      chain: a.chain,
      alpha: a.alpha,
      beta: a.beta,
      estimatedWinRate: a.alpha / (a.alpha + a.beta),
      confidence: 1 - confidenceWidth(a.alpha, a.beta)
    }));
  }

  /**
   * Get the chain with highest estimated win rate (exploitation only)
   */
  getBestChain(): string {
    const arms = getArms(this.chains);
    let best = arms[0];

    for (const arm of arms) {
      const winRate = arm.alpha / (arm.alpha + arm.beta);
      const bestWinRate = best.alpha / (best.alpha + best.beta);
      if (winRate > bestWinRate) {
        best = arm;
      }
    }

    return best.chain;
  }

  /**
   * Reset a specific chain's learning
   */
  resetChain(chain: string): void {
    upsertArm({ chain, alpha: 2, beta: 2 });
    logAI.info({ chain }, "Chain reset");
  }

  /**
   * Reset all chains
   */
  resetAll(): void {
    for (const chain of this.chains) {
      this.resetChain(chain);
    }
    this.decisionHistory = [];
    logAI.info("All chains reset");
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): BanditDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Decay old learning (for adapting to changing conditions)
   * @param factor - Decay factor (0.9 = 10% decay towards prior)
   */
  decay(factor: number = 0.95): void {
    const arms = getArms(this.chains);

    for (const arm of arms) {
      // Move alpha and beta towards prior (2, 2) by factor
      arm.alpha = 2 + (arm.alpha - 2) * factor;
      arm.beta = 2 + (arm.beta - 2) * factor;
      upsertArm(arm);
    }

    logAI.info({ factor }, "Applied decay to all arms");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ADVANCED BANDIT: UCB (Upper Confidence Bound) Alternative
// ─────────────────────────────────────────────────────────────────────────────────
export class UCBBandit {
  private chains: string[];
  private counts: Map<string, number> = new Map();
  private values: Map<string, number> = new Map();
  private totalPulls: number = 0;

  constructor(chains: string[]) {
    this.chains = chains;
    for (const chain of chains) {
      this.counts.set(chain, 0);
      this.values.set(chain, 0);
    }
  }

  chooseChain(): string {
    // First, try each chain at least once
    for (const chain of this.chains) {
      if ((this.counts.get(chain) ?? 0) === 0) {
        return chain;
      }
    }

    // UCB1 formula
    let best = this.chains[0];
    let bestUCB = -Infinity;

    for (const chain of this.chains) {
      const count = this.counts.get(chain) ?? 1;
      const value = this.values.get(chain) ?? 0;
      const exploration = Math.sqrt(2 * Math.log(this.totalPulls) / count);
      const ucb = value + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        best = chain;
      }
    }

    return best;
  }

  update(chain: string, reward: number): void {
    const count = (this.counts.get(chain) ?? 0) + 1;
    const oldValue = this.values.get(chain) ?? 0;

    // Incremental mean update
    const newValue = oldValue + (reward - oldValue) / count;

    this.counts.set(chain, count);
    this.values.set(chain, newValue);
    this.totalPulls++;
  }
}

