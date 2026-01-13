// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - CHAINLINK ORACLE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides ETH/USD price feeds from Chainlink oracles on each chain
// Used to convert gas costs to USD for accurate profit calculations
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logOracle } from "../logger.js";
import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK AGGREGATOR ABI (minimal)
// ─────────────────────────────────────────────────────────────────────────────────
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ETH/USD FEED ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────
export const ETH_USD_FEEDS: Record<ChainKey, `0x${string}`> = {
  // Base Mainnet - ETH/USD
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

  // Arbitrum One - ETH/USD
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",

  // Optimism Mainnet - ETH/USD
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",

  // Polygon Mainnet - ETH/USD (Note: native is MATIC, but we use ETH/USD for gas conversion)
  polygon: "0xF9680D99D6C9589e2a93a78A04A279e509205945"
};

// MATIC/USD for Polygon (native token)
export const MATIC_USD_FEED: `0x${string}` = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

// ─────────────────────────────────────────────────────────────────────────────────
// PRICE CACHE
// ─────────────────────────────────────────────────────────────────────────────────
interface PriceCache {
  price: number;
  timestamp: number;
  decimals: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────────
// ORACLE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get ETH/USD price from Chainlink oracle
 */
export async function getEthUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = `eth-usd-${chain}`;
  const cached = priceCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feedAddress = ETH_USD_FEEDS[chain];
    if (!feedAddress) {
      logOracle.warn({ chain }, "No ETH/USD feed configured");
      return null;
    }

    const feed = new Contract(feedAddress, AGGREGATOR_ABI, provider);

    // Get decimals and latest round data
    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1]; // answer is at index 1
    const price = Number(answer) / (10 ** Number(decimals));

    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      logOracle.error({ chain, answer: answer.toString() }, "Invalid price from oracle");
      return null;
    }

    // Check staleness (price should be updated within last hour)
    const updatedAt = Number(roundData[3]);
    const age = Math.floor(Date.now() / 1000) - updatedAt;
    if (age > 3600) {
      logOracle.warn({ chain, ageSeconds: age }, "Stale price data");
    }

    // Cache the result
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    logOracle.debug({ chain, price: price.toFixed(2), ageSeconds: age }, "ETH/USD price fetched");
    return price;

  } catch (error: any) {
    logOracle.error({ chain, error: error.message }, "Failed to fetch ETH/USD price");
    return null;
  }
}

/**
 * Get MATIC/USD price (for Polygon gas calculations)
 */
export async function getMaticUsd(provider: JsonRpcProvider): Promise<number | null> {
  const cacheKey = "matic-usd";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const feed = new Contract(MATIC_USD_FEED, AGGREGATOR_ABI, provider);

    const [decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData()
    ]);

    const answer = roundData[1];
    const price = Number(answer) / (10 ** Number(decimals));

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
      decimals: Number(decimals)
    });

    return price;

  } catch (error: any) {
    logOracle.error({ error: error.message }, "Failed to fetch MATIC/USD price");
    return null;
  }
}

/**
 * Get native token price in USD for a chain
 */
export async function getNativeTokenUsd(chain: ChainKey, provider: JsonRpcProvider): Promise<number | null> {
  if (chain === "polygon") {
    return getMaticUsd(provider);
  }
  return getEthUsd(chain, provider);
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logOracle.info("Price cache cleared");
}

/**
 * Get all cached prices (for debugging)
 */
export function getCachedPrices(): Record<string, PriceCache> {
  const result: Record<string, PriceCache> = {};
  priceCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

