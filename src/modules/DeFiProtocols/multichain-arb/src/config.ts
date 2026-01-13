// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURATION (PRODUCTION)
// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};



// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};

// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";

export type ChainKey = "base" | "arbitrum" | "optimism" | "polygon";

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const get = (k: string, defaultValue: string): string => {
  return process.env[k] || defaultValue;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export const CFG = {
  // Wallet - Operator wallet with funds
  PRIVATE_KEY: get("PRIVATE_KEY", "") || get("VITE_ETH_PRIVATE_KEY", ""),
  WALLET_ADDRESS: get("WALLET_ADDRESS", "") || get("VITE_ETH_WALLET_ADDRESS", "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"),
  
  // Timing
  TICK_MS: Number(get("TICK_MS", "700")),           // Check every 700ms
  DECISION_MS: Number(get("DECISION_MS", "5000")), // AI rotates chain every 5s

  // Trading Parameters
  MIN_PROFIT_USD: Number(get("MIN_PROFIT_USD", "0.50")),   // Min $0.50 profit
  GAS_MULT: Number(get("GAS_MULT", "1.7")),                // Gas safety multiplier
  MAX_SLIPPAGE_BPS: Number(get("MAX_SLIPPAGE_BPS", "50")), // 0.5% max slippage
  DEADLINE_SECONDS: Number(get("DEADLINE_SECONDS", "60")), // 60s deadline

  // Trade Sizes (in USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],

  // Database
  DB_PATH: get("DB_PATH", "./bot-data.json"),
  
  // Chains enabled (only those with funds)
  CHAINS: ["base", "arbitrum", "optimism"] as ChainKey[],

  // Mode - CHANGED TO LIVE BY DEFAULT
  DRY_RUN: get("DRY_RUN", "false") === "true",
  LOG_LEVEL: get("LOG_LEVEL", "info")
} as const;

// ─────────────────────────────────────────────────────────────────────────────────
// RPC CONFIGURATION (Alchemy + Public)
// ─────────────────────────────────────────────────────────────────────────────────

export type ChainRpc = { 
  read: string; 
  sim: string; 
  send: string; 
  ws: string; 
};

export const RPCS: Record<ChainKey, ChainRpc> = {
  base: {
    read: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    send: get("RPC_BASE", "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    ws: "wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  },
  arbitrum: {
    read: get("RPC_ARBITRUM", "https://arb1.arbitrum.io/rpc"),
    sim: "https://arb1.arbitrum.io/rpc",
    send: "https://arb1.arbitrum.io/rpc",
    ws: "wss://arbitrum-one.publicnode.com"
  },
  optimism: {
    read: get("RPC_OPTIMISM", "https://mainnet.optimism.io"),
    sim: "https://optimism.llamarpc.com",
    send: "https://mainnet.optimism.io",
    ws: "wss://optimism.publicnode.com"
  },
  polygon: {
    read: get("RPC_POLYGON", "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"),
    sim: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    send: "https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    ws: "wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEX ROUTER ADDRESSES BY CHAIN (Uniswap V3 SwapRouter02)
// ─────────────────────────────────────────────────────────────────────────────────

export interface DexAddresses {
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  factory: `0x${string}`;
  sushiRouter?: `0x${string}`;
}

export const DEX_ADDRESSES: Record<ChainKey, DexAddresses> = {
  base: {
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  },
  arbitrum: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  optimism: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  },
  polygon: {
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN ADDRESSES BY CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

export interface TokenAddresses {
  WETH: `0x${string}`;
  USDC: `0x${string}`;
  USDT?: `0x${string}`;
  DAI?: `0x${string}`;
}

export const TOKEN_ADDRESSES: Record<ChainKey, TokenAddresses> = {
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  polygon: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAINLINK ORACLE ADDRESSES (ETH/USD for gas conversion)
// ─────────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_ETH_USD: Record<ChainKey, `0x${string}`> = {
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  arbitrum: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  optimism: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
  polygon: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
};

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN INFO
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  chainId: number;
  nativeCurrency: string;
  explorer: string;
  blockTime: number;
  avgGasGwei: number;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  base: {
    name: "Base",
    chainId: 8453,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org",
    blockTime: 2,
    avgGasGwei: 0.01
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io",
    blockTime: 0.25,
    avgGasGwei: 0.01
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    blockTime: 2,
    avgGasGwei: 0.001
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com",
    blockTime: 2,
    avgGasGwei: 50
  }
};
