/**
 * SIMULATED SERVER DATA - DATOS DE PRUEBA
 * ========================================
 * 
 * Este archivo contiene datos simulados para demostración.
 * NO es parte de la lógica principal del proyecto.
 * 
 * En producción, estos datos vendrían del backend real.
 * 
 * ⚠️ IMPORTANTE: Este archivo es solo para testing/demo
 */

// =============================================================================
// SERVER CONFIGURATION (Simulado)
// =============================================================================

export const SIMULATED_SERVER = {
  url: 'https://arb-mainnet.g.alchemy.com/v2/nLcoIKn_OFO6lBk19FOND',
  name: 'Alchemy Arbitrum Mainnet',
  status: 'online' as const,
  network: 'Arbitrum One',
  chainId: 42161
};

// =============================================================================
// POOL DATA (Simulado)
// =============================================================================

export const SIMULATED_POOL = {
  id: 'pool-dust1',
  name: 'Pool Dust1',
  balance: 4300,
  currency: 'USDC',
  utilizationPercent: 65,
  status: 'active' as const
};

// =============================================================================
// ACTIVE POOL - 4700 USDT (Nuevo Pool)
// =============================================================================

export const ACTIVE_POOL_USDT = {
  id: 'pool-usdt-active',
  name: 'Active Pool',
  balance: 4700,
  currency: 'USDT',
  utilizationPercent: 78,
  status: 'active' as const,
  contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  network: 'Ethereum Mainnet',
  chainId: 1
};

// =============================================================================
// TRANSACTION HISTORY (Simulado)
// =============================================================================

export interface SimulatedTransaction {
  id: string;
  wallet: string;
  amount: number;
  currency: string;
  type: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export const SIMULATED_TRANSACTIONS: SimulatedTransaction[] = [
  {
    id: 'TX-001',
    wallet: 'TJX54FbSGEnX9sbMzc8FbAqepzZJdULEWx',
    amount: 4490,
    currency: 'USDC',
    type: 'USDt swap USDc',
    timestamp: '2025-12-26 09:48:36',
    status: 'completed'
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isServerOnline(): boolean {
  return SIMULATED_SERVER.status === 'online';
}

export function getPoolUtilization(): number {
  return SIMULATED_POOL.utilizationPercent;
}

export function formatPoolBalance(): string {
  return `${SIMULATED_POOL.balance.toLocaleString()} ${SIMULATED_POOL.currency}`;
}

// =============================================================================
// MINT POOL ERROR SIMULATION
// =============================================================================

export interface MintPoolError {
  type: 'GAS_FEE_ERROR' | 'PENDING' | 'SUCCESS' | 'POOL_REQUIREMENT_ERROR';
  message: string;
  txHash: string;
  etherscanUrl: string;
  gasPrice: string;
  baseFee: string;
  timestamp: string;
}

export function simulateMintPoolTransaction(): MintPoolError {
  // Generar un TX hash simulado
  const txHash = '0x' + Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return {
    type: 'GAS_FEE_ERROR',
    message: 'Transaction gas fee is above the current base fee. Transaction is pending confirmation.',
    txHash: txHash,
    etherscanUrl: `https://etherscan.io/tx/${txHash}`,
    gasPrice: '45.2 Gwei',
    baseFee: '32.8 Gwei',
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// EXPORT ALL AS DEFAULT FOR EASY IMPORT
// =============================================================================

export default {
  server: SIMULATED_SERVER,
  pool: SIMULATED_POOL,
  activePoolUSDT: ACTIVE_POOL_USDT,
  transactions: SIMULATED_TRANSACTIONS
};
