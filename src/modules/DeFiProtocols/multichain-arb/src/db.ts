// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - DATABASE (In-Memory / File-based)
// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};



// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// Versión simplificada sin SQLite nativo para evitar problemas de compilación

import { CFG } from "./config.js";
import { log } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATABASE
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainMetric {
  chain: string;
  ts: number;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  updatedAt: number;
}

interface TradeRecord {
  id: string;
  chain: string;
  routeName: string;
  amountIn: string;
  amountOut: string;
  profitUsd: number;
  gasUsd: number;
  txHash?: string;
  status: string;
  createdAt: number;
}

// In-memory storage
const metrics: ChainMetric[] = [];
const banditStates: Map<string, BanditState> = new Map();
const trades: TradeRecord[] = [];

// File path for persistence
const DATA_FILE = path.resolve(CFG.DB_PATH.replace('.db', '.json'));

// ─────────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────────

function saveToFile(): void {
  try {
    const data = {
      metrics: metrics.slice(-1000), // Keep last 1000 metrics
      banditStates: Array.from(banditStates.entries()),
      trades: trades.slice(-500) // Keep last 500 trades
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail on save errors
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.metrics) metrics.push(...data.metrics);
      if (data.banditStates) {
        for (const [chain, state] of data.banditStates) {
          banditStates.set(chain, state);
        }
      }
      if (data.trades) trades.push(...data.trades);
      log.info({ file: DATA_FILE }, "Database loaded from file");
    }
  } catch (error) {
    log.warn("Could not load database file, starting fresh");
  }
}

// Load on startup
loadFromFile();

// Auto-save every 30 seconds
setInterval(saveToFile, 30000);

log.info({ dbPath: DATA_FILE }, "Database initialized (in-memory with file backup)");

// ─────────────────────────────────────────────────────────────────────────────────
// METRIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricRecord {
  chain: string;
  profitUsd: number;
  gasUsd: number;
  success: boolean;
  latencyMs: number;
}

export function insertMetric(m: MetricRecord): void {
  metrics.push({
    ...m,
    ts: Date.now()
  });
  
  // Keep only last 10000 metrics in memory
  if (metrics.length > 10000) {
    metrics.splice(0, metrics.length - 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// BANDIT STATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getBanditState(chain: string): BanditState | undefined {
  return banditStates.get(chain);
}

export function setBanditState(chain: string, alpha: number, beta: number): void {
  banditStates.set(chain, {
    chain,
    alpha,
    beta,
    updatedAt: Date.now()
  });
}

export function getAllBanditStates(): BanditState[] {
  return Array.from(banditStates.values());
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function insertTrade(t: Omit<TradeRecord, 'createdAt'>): void {
  trades.push({
    ...t,
    createdAt: Date.now()
  });
}

export function updateTradeStatus(id: string, status: string, txHash?: string): void {
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.status = status;
    if (txHash) trade.txHash = txHash;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATISTICS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainStats {
  chain: string;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

export function getChainStats(chain: string, since?: number): ChainStats {
  const filtered = metrics.filter(m => 
    m.chain === chain && (!since || m.ts >= since)
  );

  const totalTrades = filtered.length;
  const successfulTrades = filtered.filter(m => m.success).length;
  const totalProfitUsd = filtered.reduce((sum, m) => sum + m.profitUsd, 0);
  const totalGasUsd = filtered.reduce((sum, m) => sum + m.gasUsd, 0);
  const avgLatencyMs = totalTrades > 0 
    ? filtered.reduce((sum, m) => sum + m.latencyMs, 0) / totalTrades 
    : 0;

  return {
    chain,
    totalTrades,
    successfulTrades,
    totalProfitUsd,
    totalGasUsd,
    netProfitUsd: totalProfitUsd - totalGasUsd,
    winRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
    avgLatencyMs
  };
}

export function getAllChainStats(since?: number): ChainStats[] {
  const chains = ["base", "arbitrum", "optimism", "polygon"];
  return chains.map(chain => getChainStats(chain, since));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────────

export function cleanupOldMetrics(daysToKeep: number = 30): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const before = metrics.length;
  const newMetrics = metrics.filter(m => m.ts >= cutoff);
  metrics.length = 0;
  metrics.push(...newMetrics);
  return before - metrics.length;
}

// Export db object for compatibility
export const db = {
  prepare: (sql: string) => ({
    all: () => getAllBanditStates(),
    run: (...args: any[]) => {}
  })
};
