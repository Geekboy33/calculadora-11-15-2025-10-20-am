/**
 * Chainlink ETH/USD Price Feed Integration
 * Mainnet Address: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
 * 
 * Returns real-time ETH/USD price with validation
 */

import { ethers } from "ethers";

// Chainlink Aggregator V3 Interface (minimal)
const AGGREGATOR_V3_ABI = [
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function description() view returns (string)"
];

export interface ChainlinkPriceResult {
  price: bigint;        // int256 positivo (bigint), escalado a `decimals`
  decimals: number;     // esperado 8
  updatedAt: number;    // unix seconds
  humanPrice: number;   // precio legible (e.g., 2500.00)
  source: string;       // "Chainlink ETH/USD"
  feedAddress: string;  // dirección del feed
}

/**
 * Get ETH/USD price from Chainlink oracle
 * @param provider - ethers.Provider connected to Ethereum mainnet
 * @returns Price data including scaled bigint and human-readable price
 */
export async function getChainlinkEthUsd(provider: ethers.Provider): Promise<ChainlinkPriceResult> {
  const feed = process.env.CHAINLINK_ETH_USD_FEED;
  
  if (!feed) {
    throw new Error("MISSING_CHAINLINK_ETH_USD_FEED");
  }

  console.log(`[Chainlink] Fetching ETH/USD price from: ${feed}`);

  const aggregator = new ethers.Contract(feed, AGGREGATOR_V3_ABI, provider);

  // Get decimals (should be 8)
  const decimalsRaw = await aggregator.decimals();
  const decimals: number = Number(decimalsRaw);
  
  // Get latest round data
  const roundData = await aggregator.latestRoundData();
  const roundId: bigint = BigInt(roundData[0]);
  const answer: bigint = BigInt(roundData[1]);
  const updatedAt: bigint = BigInt(roundData[3]);
  const answeredInRound: bigint = BigInt(roundData[4]);

  // Validations
  if (answer <= 0n) {
    throw new Error("CHAINLINK_BAD_ANSWER: Price is zero or negative");
  }
  
  if (updatedAt === 0n) {
    throw new Error("CHAINLINK_STALE: Price has never been updated");
  }
  
  if (answeredInRound < roundId) {
    throw new Error("CHAINLINK_INCOMPLETE_ROUND: Answer is from incomplete round");
  }

  // Check for stale data (more than 1 hour old)
  const now = BigInt(Math.floor(Date.now() / 1000));
  const age = Number(now - updatedAt);
  const maxAge = 3600; // 1 hour
  
  if (age > maxAge) {
    console.warn(`[Chainlink] WARNING: Price is ${age} seconds old (max: ${maxAge})`);
    // Don't throw, just warn - Chainlink updates based on deviation
  }

  // Calculate human-readable price (answer / 10^decimals)
  const humanPrice = Number(answer) / Math.pow(10, decimals);

  console.log(`[Chainlink] ✓ ETH/USD Price: $${humanPrice.toFixed(2)}`);
  console.log(`[Chainlink]   Raw: ${answer.toString()} (${decimals} decimals)`);
  console.log(`[Chainlink]   Updated: ${new Date(Number(updatedAt) * 1000).toISOString()}`);
  console.log(`[Chainlink]   Age: ${age} seconds`);

  return {
    price: answer as bigint,
    decimals: Number(decimals),
    updatedAt: Number(updatedAt),
    humanPrice,
    source: "Chainlink ETH/USD",
    feedAddress: feed
  };
}

/**
 * Get ETH/USD price with fallback to default value
 * Use this in production to ensure minting doesn't fail if Chainlink is unavailable
 */
export async function getChainlinkEthUsdWithFallback(
  provider: ethers.Provider,
  defaultPrice: number = 2500.00
): Promise<ChainlinkPriceResult> {
  try {
    return await getChainlinkEthUsd(provider);
  } catch (error: any) {
    console.error(`[Chainlink] ERROR: ${error.message}`);
    console.log(`[Chainlink] Using fallback price: $${defaultPrice}`);
    
    const decimals = 8;
    const scaledPrice = BigInt(Math.round(defaultPrice * Math.pow(10, decimals)));
    
    return {
      price: scaledPrice,
      decimals,
      updatedAt: Math.floor(Date.now() / 1000),
      humanPrice: defaultPrice,
      source: "DAES_FALLBACK",
      feedAddress: "N/A"
    };
  }
}

export default {
  getChainlinkEthUsd,
  getChainlinkEthUsdWithFallback
};

