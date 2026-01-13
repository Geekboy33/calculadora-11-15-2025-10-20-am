// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - DEX ROUTES (PRODUCTION)
// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}



// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas completas para Base, Arbitrum, Optimism, Polygon
// Uniswap V3 con USDC como base

import { ChainKey } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────────────────────────────────────────

export type Route = {
  name: string;
  tokenIn: `0x${string}`;
  tokenMid: `0x${string}`;
  tokenOut: `0x${string}`;
  fee1: number;
  fee2: number;
  quoterV2: `0x${string}`;
  router: `0x${string}`;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" as `0x${string}`
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`,
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as `0x${string}`,
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as `0x${string}`,
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" as `0x${string}`,
    OP: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb" as `0x${string}`
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" as `0x${string}`,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as `0x${string}`,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

const DEX = {
  base: {
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`,
    router: "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`,
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as `0x${string}`
  },
  arbitrum: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  optimism: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  },
  polygon: {
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`,
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FEE TIERS
// ─────────────────────────────────────────────────────────────────────────────────

const FEE = {
  LOWEST: 100,   // 0.01% - Ultra stable pairs
  LOW: 500,      // 0.05% - Stable pairs (USDC/USDT, USDC/DAI)
  MEDIUM: 3000,  // 0.30% - Most pairs (ETH/USDC)
  HIGH: 10000    // 1.00% - Exotic pairs
};

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTES BY CHAIN (PRODUCTION)
// ─────────────────────────────────────────────────────────────────────────────────

export const ROUTES_BY_CHAIN: Record<ChainKey, Route[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // BASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  base: [
    // USDC → WETH → USDC (fee tier arbitrage)
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH cheap (0.05%), sell expensive (0.30%)"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Buy WETH (0.30%), sell cheap (0.05%)"
    },
    // USDC ↔ USDbC arbitrage (bridged vs native)
    {
      name: "USDC-WETH-USDbC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.WETH,
      tokenOut: TOKENS.base.USDbC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Native USDC → WETH → Bridged USDbC"
    },
    // DAI routes
    {
      name: "USDC-DAI-USDC 100/100",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.DAI,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "Stable swap USDC ↔ DAI"
    },
    // cbETH routes
    {
      name: "USDC-cbETH-USDC 500/500",
      tokenIn: TOKENS.base.USDC,
      tokenMid: TOKENS.base.cbETH,
      tokenOut: TOKENS.base.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.base.quoterV2,
      router: DEX.base.router,
      description: "USDC → cbETH → USDC"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARBITRUM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  arbitrum: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe (native vs bridged)
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.WETH,
      tokenOut: TOKENS.arbitrum.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Native USDC → WETH → Bridged USDCe"
    },
    // USDT routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.USDT,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // ARB token routes
    {
      name: "USDC-ARB-USDC 3000/3000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.ARB,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "ARB token arbitrage"
    },
    // GMX routes
    {
      name: "USDC-GMX-USDC 10000/10000",
      tokenIn: TOKENS.arbitrum.USDC,
      tokenMid: TOKENS.arbitrum.GMX,
      tokenOut: TOKENS.arbitrum.USDC,
      fee1: FEE.HIGH,
      fee2: FEE.HIGH,
      quoterV2: DEX.arbitrum.quoterV2,
      router: DEX.arbitrum.router,
      description: "GMX exotic pair arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMISM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  optimism: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Fee tier arb USDC/WETH"
    },
    {
      name: "USDC-WETH-USDC 3000/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Reverse fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WETH-USDCe 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.WETH,
      tokenOut: TOKENS.optimism.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Native → Bridged USDC via WETH"
    },
    // OP token routes
    {
      name: "USDC-OP-USDC 3000/3000",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.OP,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "OP token arbitrage"
    },
    // wstETH routes
    {
      name: "USDC-wstETH-USDC 500/500",
      tokenIn: TOKENS.optimism.USDC,
      tokenMid: TOKENS.optimism.wstETH,
      tokenOut: TOKENS.optimism.USDC,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.optimism.quoterV2,
      router: DEX.optimism.router,
      description: "Lido stETH arbitrage"
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLYGON ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  polygon: [
    // USDC → WETH → USDC
    {
      name: "USDC-WETH-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WETH,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Fee tier arb USDC/WETH"
    },
    // USDC → WMATIC → USDC
    {
      name: "USDC-WMATIC-USDC 500/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOW,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "MATIC fee tier arb"
    },
    // USDC ↔ USDCe
    {
      name: "USDC-WMATIC-USDCe 500/500",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WMATIC,
      tokenOut: TOKENS.polygon.USDCe,
      fee1: FEE.LOW,
      fee2: FEE.LOW,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Native → Bridged USDC"
    },
    // Stablecoin routes
    {
      name: "USDC-USDT-USDC 100/100",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.USDT,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.LOWEST,
      fee2: FEE.LOWEST,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "Stable swap USDC ↔ USDT"
    },
    // WBTC routes
    {
      name: "USDC-WBTC-USDC 3000/3000",
      tokenIn: TOKENS.polygon.USDC,
      tokenMid: TOKENS.polygon.WBTC,
      tokenOut: TOKENS.polygon.USDC,
      fee1: FEE.MEDIUM,
      fee2: FEE.MEDIUM,
      quoterV2: DEX.polygon.quoterV2,
      router: DEX.polygon.router,
      description: "WBTC arbitrage"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getRoutesForChain(chain: ChainKey): Route[] {
  return ROUTES_BY_CHAIN[chain] || [];
}

export function getRouteByName(chain: ChainKey, name: string): Route | undefined {
  return ROUTES_BY_CHAIN[chain]?.find(r => r.name === name);
}

export function getTotalRouteCount(): number {
  return Object.values(ROUTES_BY_CHAIN).reduce((sum, routes) => sum + routes.length, 0);
}

export function printRouteStats(): void {
  console.log("\n📊 ROUTE STATISTICS:\n");
  
  for (const [chain, routes] of Object.entries(ROUTES_BY_CHAIN)) {
    console.log(`  ${chain.toUpperCase()}: ${routes.length} routes`);
    for (const route of routes) {
      console.log(`    └─ ${route.name}: ${route.description}`);
    }
  }
  
  console.log(`\n  TOTAL: ${getTotalRouteCount()} routes\n`);
}
