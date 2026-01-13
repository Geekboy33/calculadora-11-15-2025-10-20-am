/**
 * DAES dUSD Bridge - Frontend Constants
 * =====================================
 * 
 * ⚠️ IMPORTANT: This file contains NO sensitive data.
 * All RPC keys, private keys, and secrets are managed by the backend.
 * 
 * The frontend only calls the DAES backend API.
 * beneficiary is NEVER set by frontend - it's server-side only.
 */

// =============================================================================
// ARBITRUM NETWORK CONFIGURATION (Public Information Only)
// =============================================================================

export const ARBITRUM_CHAIN_ID = 42161;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export const ARBITRUM_NETWORKS = {
  mainnet: {
    chainId: ARBITRUM_CHAIN_ID,
    name: 'Arbitrum One',
    currency: 'ETH',
    explorer: 'https://arbiscan.io',
  },
  sepolia: {
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    name: 'Arbitrum Sepolia',
    currency: 'ETH',
    explorer: 'https://sepolia.arbiscan.io',
  },
} as const;

// =============================================================================
// EXPLORER URLS
// =============================================================================

export const ARBITRUM_EXPLORER = 'https://arbiscan.io';
export const ARBITRUM_SEPOLIA_EXPLORER = 'https://sepolia.arbiscan.io';

export const getExplorerTxUrl = (txHash: string, network: 'mainnet' | 'sepolia' = 'mainnet'): string => {
  const explorer = network === 'mainnet' ? ARBITRUM_EXPLORER : ARBITRUM_SEPOLIA_EXPLORER;
  return `${explorer}/tx/${txHash}`;
};

export const getExplorerAddressUrl = (address: string, network: 'mainnet' | 'sepolia' = 'mainnet'): string => {
  const explorer = network === 'mainnet' ? ARBITRUM_EXPLORER : ARBITRUM_SEPOLIA_EXPLORER;
  return `${explorer}/address/${address}`;
};

export const getExplorerTokenUrl = (address: string, network: 'mainnet' | 'sepolia' = 'mainnet'): string => {
  const explorer = network === 'mainnet' ? ARBITRUM_EXPLORER : ARBITRUM_SEPOLIA_EXPLORER;
  return `${explorer}/token/${address}`;
};

// =============================================================================
// PUBLIC CONTRACT ADDRESSES (for display purposes only)
// =============================================================================

export const BRIDGE_CONTRACT_ADDRESS = '0x96818E28942C3FF496b56090A4791bC050F48bA5';
export const REGISTRY_ADDRESS = '0x3db99FACe6BB270E86BCA3355655dB747867f67b';
export const DUSD_TOKEN_ADDRESS = '0x346bBC9976AE540896125B01e14E8bc7Ef1EDB32';

export const BRIDGE_CONTRACT = {
  address: BRIDGE_CONTRACT_ADDRESS,
  name: 'DAES dUSD Bridge Minter',
  network: 'mainnet' as const,
  chainId: ARBITRUM_CHAIN_ID,
  explorerUrl: getExplorerAddressUrl(BRIDGE_CONTRACT_ADDRESS, 'mainnet'),
} as const;

// =============================================================================
// dUSD TOKEN CONFIGURATION
// =============================================================================

export const DUSD_TOKEN = {
  symbol: 'dUSD',
  name: 'DAES USD',
  decimals: 6,
  address: DUSD_TOKEN_ADDRESS,
} as const;

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const API_BASE_URL = import.meta.env.VITE_DAES_API_BASE || 'http://localhost:3000';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  dusdHealth: `${API_BASE_URL}/api/dusd/health`,
  mintRequest: `${API_BASE_URL}/api/dusd/mint-request`,
  getHold: (daesRef: string) => `${API_BASE_URL}/api/dusd/hold/${daesRef}`,
  getHolds: `${API_BASE_URL}/api/dusd/holds`,
  getStats: `${API_BASE_URL}/api/dusd/stats`,
} as const;

// =============================================================================
// DEFAULT VALUES (Frontend limits only - server has its own)
// =============================================================================

export const DEFAULTS = {
  expirySeconds: 600,      // 10 minutes
  minMintAmount: 1,        // $1 USD minimum
  maxMintAmount: 1000000,  // $1M USD maximum
} as const;

// =============================================================================
// STATUS TYPES
// =============================================================================

export type HoldStatus = 
  | 'HOLD_CONFIRMED' 
  | 'AUTHORIZED' 
  | 'MINTING' 
  | 'CAPTURED' 
  | 'RELEASED' 
  | 'FAILED' 
  | 'EXPIRED';

export const STATUS_LABELS: Record<HoldStatus, { label: string; labelEn: string; color: string }> = {
  HOLD_CONFIRMED: { label: 'Hold Confirmado', labelEn: 'Hold Confirmed', color: 'blue' },
  AUTHORIZED: { label: 'Autorizado', labelEn: 'Authorized', color: 'purple' },
  MINTING: { label: 'Minteando...', labelEn: 'Minting...', color: 'yellow' },
  CAPTURED: { label: 'Capturado', labelEn: 'Captured', color: 'green' },
  RELEASED: { label: 'Liberado', labelEn: 'Released', color: 'orange' },
  FAILED: { label: 'Fallido', labelEn: 'Failed', color: 'red' },
  EXPIRED: { label: 'Expirado', labelEn: 'Expired', color: 'gray' },
} as const;

// =============================================================================
// EIP-712 DOMAIN (Public - for display/reference only)
// =============================================================================

export const EIP712_DOMAIN = {
  name: "DAES dUSD Bridge",
  version: "1",
  chainId: ARBITRUM_CHAIN_ID,
  verifyingContract: BRIDGE_CONTRACT_ADDRESS,
} as const;

console.log('[Constants] Frontend config loaded ✅');
console.log('[Constants] API Base:', API_BASE_URL);

