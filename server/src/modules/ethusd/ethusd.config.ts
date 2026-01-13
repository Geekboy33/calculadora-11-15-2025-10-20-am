/**
 * ETH USD Module Configuration
 * Ethereum Mainnet settings for USDT Transfers
 * Supports both DAES USD Alchemy and USDT Converter modules
 */

// Build RPC URL from Infura Project ID if not explicitly set
function buildRpcUrl(): string {
  if (process.env.ETH_RPC_URL) {
    return process.env.ETH_RPC_URL;
  }
  // Fallback to Infura if project ID is set
  const infuraId = process.env.INFURA_PROJECT_ID || process.env.VITE_INFURA_PROJECT_ID;
  if (infuraId) {
    return `https://mainnet.infura.io/v3/${infuraId}`;
  }
  // Default Infura project ID from user config
  return 'https://mainnet.infura.io/v3/6b7bd498942d42edab758545c7d30403';
}

export const ETH_USD_CONFIG = {
  // Network
  chainId: Number(process.env.ETH_CHAIN_ID || 1),
  rpcUrl: buildRpcUrl(),
  wsUrl: process.env.ETH_WS_URL || '',
  confirmations: Number(process.env.ETH_CONFIRMATIONS || 2),

  // Contracts (for DAES USD Alchemy - optional for USDT transfers)
  usdToken: process.env.ETH_USD_TOKEN || '0x3db99FACe6BB270E86BCA3355655dB747867f67b',
  bridgeMinter: process.env.ETH_BRIDGE_MINTER || '0xa2969f87E9C5C6996aC7E7fFC36C35A8ba178A03',
  registry: process.env.ETH_REGISTRY || '0x346bBC9976AE540896125B01e14E8bc7Ef1EDB32',

  // EIP-712 Domain - VERSION 2
  eip712Domain: {
    name: "DAES USD BridgeMinter",
    version: "2",
  },

  // Minter version
  minterVersion: 2,

  // ISO4217 code for USD
  iso4217: "USD",
  iso4217Bytes: "0x555344",

  // Price configuration
  price: {
    decimals: 8,
    defaultEthUsdPrice: 2500.00,
  }
};

/**
 * Validate required configuration for USDT transfers
 */
export function validateEthUsdConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ETH_USD_CONFIG.rpcUrl) {
    errors.push("ETH_RPC_URL or INFURA_PROJECT_ID is required");
  }
  
  // For USDT transfers, only operator private key is required
  const operatorKey = process.env.ETH_OPERATOR_PRIVATE_KEY || 
                      process.env.ETH_PRIVATE_KEY || 
                      process.env.VITE_ETH_PRIVATE_KEY;
  if (!operatorKey) {
    errors.push("ETH_OPERATOR_PRIVATE_KEY or ETH_PRIVATE_KEY is required");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default ETH_USD_CONFIG;
