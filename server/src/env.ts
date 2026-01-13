/**
 * Environment Configuration
 * MUST be imported FIRST before any other imports
 */
import dotenv from "dotenv";
dotenv.config();

// Log which modules are configured
console.log('[ENV] Loading environment configuration...');

// Check dUSD module (Arbitrum) - Optional
const dusdVars = [
  'DAES_SIGNER_PRIVATE_KEY',
  'OPERATOR_PRIVATE_KEY',
  'ARBITRUM_RPC_HTTPS',
  'BRIDGE_MINTER_ADDRESS',
  'DEFAULT_BENEFICIARY'
];

let dusdConfigured = true;
for (const key of dusdVars) {
  if (!process.env[key]) {
    dusdConfigured = false;
  }
}

if (dusdConfigured) {
  console.log('✅ dUSD Module (Arbitrum) configured');
} else {
  console.log('⚠️ dUSD Module (Arbitrum) not configured - module disabled');
}

// Check USDT Converter module (Ethereum) - Uses defaults if not set
const hasEthPrivateKey = process.env.ETH_OPERATOR_PRIVATE_KEY || 
                         process.env.ETH_PRIVATE_KEY || 
                         process.env.VITE_ETH_PRIVATE_KEY;

const hasRpcUrl = process.env.ETH_RPC_URL || 
                  process.env.INFURA_PROJECT_ID || 
                  process.env.VITE_INFURA_PROJECT_ID;

if (hasEthPrivateKey || hasRpcUrl) {
  console.log('✅ USDT Converter Module (Ethereum) configured from env');
} else {
  console.log('⚠️ USDT Converter Module using default configuration');
}

console.log('[ENV] Environment loaded');
