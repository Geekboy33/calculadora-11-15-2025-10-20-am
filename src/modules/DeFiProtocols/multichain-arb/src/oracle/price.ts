// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - PRICE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}




// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}


// ═══════════════════════════════════════════════════════════════════════════════

import { JsonRpcProvider } from "ethers";
import { getEthUsd, getMaticUsd, getNativeTokenUsd } from "./chainlink.js";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// FALLBACK PRICES (conservative estimates for L2s when oracle fails)
// ─────────────────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_USD: Record<ChainKey, number> = {
  base: 0.05,      // ~$0.05 per swap on Base
  arbitrum: 0.08,  // ~$0.08 per swap on Arbitrum
  optimism: 0.06,  // ~$0.06 per swap on Optimism
  polygon: 0.02    // ~$0.02 per swap on Polygon
};

// ─────────────────────────────────────────────────────────────────────────────────
// GAS CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GasToUsdParams {
  chain: ChainKey;
  provider: JsonRpcProvider;
  gasUsed: bigint;
  gasPriceWei: bigint;
}

/**
 * Convert gas cost to USD
 */
export async function gasToUsd(params: GasToUsdParams): Promise<number> {
  const { chain, provider, gasUsed, gasPriceWei } = params;

  try {
    // Get native token price
    const nativePrice = await getNativeTokenUsd(chain, provider);

    if (!nativePrice) {
      // Use fallback if oracle fails
      logOracle.warn({ chain }, "Using fallback gas cost");
      return FALLBACK_GAS_USD[chain];
    }

    // Calculate cost in native token
    const weiCost = gasUsed * gasPriceWei;
    const nativeCost = Number(weiCost) / 1e18;

    // Convert to USD
    const usdCost = nativeCost * nativePrice;

    logOracle.debug({
      chain,
      gasUsed: gasUsed.toString(),
      gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(2),
      nativePrice: nativePrice.toFixed(2),
      usdCost: usdCost.toFixed(4)
    }, "Gas cost calculated");

    return usdCost;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to calculate gas USD");
    return FALLBACK_GAS_USD[chain];
  }
}

/**
 * Estimate gas cost for a typical swap operation
 */
export async function estimateSwapGasUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  numSwaps: number = 2
): Promise<number> {
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;

    // Typical gas per swap on L2s
    const gasPerSwap: Record<ChainKey, bigint> = {
      base: 150000n,
      arbitrum: 200000n,
      optimism: 150000n,
      polygon: 180000n
    };

    const totalGas = gasPerSwap[chain] * BigInt(numSwaps);

    return gasToUsd({
      chain,
      provider,
      gasUsed: totalGas,
      gasPriceWei: gasPrice
    });

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to estimate swap gas");
    return FALLBACK_GAS_USD[chain] * numSwaps;
  }
}

/**
 * Check if a trade is profitable after gas costs
 */
export async function isProfitableAfterGas(params: {
  chain: ChainKey;
  provider: JsonRpcProvider;
  grossProfitUsd: number;
  estimatedGas: bigint;
  minProfitUsd: number;
  gasMult: number;
}): Promise<{ profitable: boolean; netProfitUsd: number; gasUsd: number }> {
  const feeData = await params.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const gasUsd = await gasToUsd({
    chain: params.chain,
    provider: params.provider,
    gasUsed: params.estimatedGas,
    gasPriceWei: gasPrice
  });

  const netProfitUsd = params.grossProfitUsd - gasUsd;
  const minRequired = Math.max(params.minProfitUsd, gasUsd * params.gasMult);
  const profitable = netProfitUsd >= minRequired;

  return { profitable, netProfitUsd, gasUsd };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN PRICE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get current gas price in Gwei
 */
export async function getGasPriceGwei(provider: JsonRpcProvider): Promise<number> {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return Number(gasPrice) / 1e9;
}

/**
 * Get L1 data cost estimate (for L2s that post to L1)
 * This is important for accurate cost estimation on Arbitrum/Optimism
 */
export async function getL1DataCostUsd(
  chain: ChainKey,
  provider: JsonRpcProvider,
  callDataBytes: number
): Promise<number> {
  // Only applicable for rollups
  if (chain !== "arbitrum" && chain !== "optimism" && chain !== "base") {
    return 0;
  }

  try {
    // Approximate L1 data cost
    // Arbitrum: ~16 gas per non-zero byte, ~4 per zero byte
    // Optimism/Base: similar with EIP-4844 blobs now

    const ethPrice = await getEthUsd(chain, provider);
    if (!ethPrice) return 0;

    // Rough estimate: assume 50% zero bytes
    const l1GasPerByte = 10; // average
    const l1GasPrice = 30; // Gwei, conservative estimate
    const l1Gas = callDataBytes * l1GasPerByte;
    const l1CostWei = BigInt(l1Gas) * BigInt(l1GasPrice * 1e9);
    const l1CostEth = Number(l1CostWei) / 1e18;

    return l1CostEth * ethPrice;

  } catch {
    return 0.01; // Small fallback for L1 data cost
  }
}

