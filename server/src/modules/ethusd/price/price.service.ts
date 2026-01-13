/**
 * Price Service
 * Handles price aggregation and validation
 * 
 * For USD stablecoin: Returns 1:1 USD peg
 * For ETH/USD: Uses Chainlink oracle (see chainlinkEthUsd.ts)
 */

import { PriceSnapshot, PriceSource } from "./price.types.js";

/**
 * Get current price snapshot
 * For USD stablecoin, this is always 1.00
 */
export async function getPriceSnapshot(
  asset: string = "USD",
  currency: string = "USD"
): Promise<PriceSnapshot> {
  const now = Date.now();

  // For USD/USD, it's always 1:1
  if (asset === "USD" && currency === "USD") {
    return {
      asset,
      currency,
      medianPrice: 1.0,
      sources: [
        {
          name: "DAES_INTERNAL",
          price: 1.0,
          timestamp: now,
          confidence: 100
        }
      ],
      timestamp: now
    };
  }

  // Placeholder for future price sources
  const sources: PriceSource[] = [
    {
      name: "PLACEHOLDER_SOURCE_1",
      price: 1.0,
      timestamp: now,
      confidence: 100
    },
    {
      name: "PLACEHOLDER_SOURCE_2",
      price: 1.0,
      timestamp: now,
      confidence: 100
    },
    {
      name: "PLACEHOLDER_SOURCE_3",
      price: 1.0,
      timestamp: now,
      confidence: 100
    }
  ];

  // Calculate median
  const prices = sources.map(s => s.price).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];

  return {
    asset,
    currency,
    medianPrice,
    sources,
    timestamp: now
  };
}

/**
 * Calculate median from array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

/**
 * Validate price is within acceptable range
 * For stablecoin: should be very close to 1.0
 */
export function validatePrice(
  price: number,
  expectedPrice: number = 1.0,
  tolerance: number = 0.05 // 5% tolerance
): boolean {
  const deviation = Math.abs(price - expectedPrice) / expectedPrice;
  return deviation <= tolerance;
}

export default {
  getPriceSnapshot,
  calculateMedian,
  validatePrice
};
