/**
 * Price Service Types
 * For future price feed integration
 */

export interface PriceSource {
  name: string;
  price: number;
  timestamp: number;
  confidence: number; // 0-100
}

export interface PriceSnapshot {
  asset: string;
  currency: string;
  medianPrice: number;
  sources: PriceSource[];
  timestamp: number;
  blockNumber?: number;
}

export interface PriceConfig {
  sources: string[];
  stalePriceThreshold: number; // seconds
  minSources: number;
}

