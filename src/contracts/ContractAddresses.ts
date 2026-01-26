/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  📋 DCB TREASURY - CONTRACT ADDRESSES                                                            ║
 * ║  Digital Commercial Bank Ltd                                                                     ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// Network configurations
export const NETWORKS = {
  LEMONCHAIN_MAINNET: {
    chainId: 1005,
    name: 'LemonChain Mainnet',
    rpcUrl: 'https://rpc.lemonchain.io',
    explorerUrl: 'https://explorer.lemonchain.io',
    currency: {
      name: 'LEMON',
      symbol: 'LEMON',
      decimals: 18
    }
  },
  LEMONCHAIN_TESTNET: {
    chainId: 1006,
    name: 'LemonChain Testnet',
    rpcUrl: 'https://rpc.testnet.lemonchain.io',
    explorerUrl: 'https://testnet.explorer.lemonchain.io',
    currency: {
      name: 'LEMON',
      symbol: 'LEMON',
      decimals: 18
    }
  }
} as const;

// Contract addresses - TESTNET (LemonChain Chain ID: 1006)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// VUSD (Virtual USD) ECOSYSTEM - Deployed January 2026
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const TESTNET_CONTRACTS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // CORE VUSD CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  
  // VUSD Token - Main stablecoin (ERC-20, 6 decimals)
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // VUSDMinter - Authorized minter with 3-signature verification
  VUSDMinter: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
  
  // USDTokenized - First signature, ISO 20022 & SWIFT support
  USD: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  
  // LockBox - Second signature, secure custody for locked USD
  LockBox: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  
  // MintingBridge - Third signature, final minting authorization
  MintingBridge: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // SUPPORTING CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  
  // CustodyVault - M1 Custody Account verification
  CustodyVault: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  
  // BankRegistry - Certified banks for Treasury Minting
  BankRegistry: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
  
  // PriceOracle - Multi-currency price feeds (15 ISO 4217 currencies)
  PriceOracle: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // LEGACY ALIASES (for backward compatibility)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  LocksTreasuryVUSD: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  VUSDMinting: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  
  // Security contracts (to be deployed)
  PriceOracleAggregator: '0x0000000000000000000000000000000000000000',
  KYCComplianceRegistry: '0x0000000000000000000000000000000000000000',
  PostQuantumSignatureVerifier: '0x0000000000000000000000000000000000000000',
  
  // Governance contracts (to be deployed)
  DCBTimelock: '0x0000000000000000000000000000000000000000',
  DCBGovernance: '0x0000000000000000000000000000000000000000'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AUTHORIZED WALLETS FOR VUSD ECOSYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const AUTHORIZED_WALLETS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY ADMIN - Main deployer with MINTER_ROLE (assigned in constructor)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  DCB_TREASURY_ADMIN: {
    address: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
    name: 'DCB Treasury Admin (MINTER_ROLE)',
    roles: [
      'DEFAULT_ADMIN_ROLE',   // Can grant/revoke all roles
      'MINTER_ROLE',          // Can inject USD and mint tokens ✓
      'BANK_SIGNER_ROLE',     // Can sign bank certifications
      'DAES_OPERATOR_ROLE',   // Can inject from DAES
      'COMPLIANCE_ROLE'       // Can manage KYC/blacklist
    ],
    description: 'Main deployer with MINTER_ROLE - roles assigned in USDTokenized constructor',
    assignedInConstructor: true
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // VUSD MINTER CONTRACT - Reference address (not a wallet with roles)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  VUSD_MINTER_CONTRACT: {
    address: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    name: 'VUSDMinter Contract',
    roles: [], // This is a CONTRACT, not a wallet with roles
    description: 'VUSDMinter smart contract - referenced as VUSD_MINTER_WALLET constant in USDTokenized',
    isContract: true
  }
};

// Contract addresses - MAINNET (LemonChain Chain ID: 1005)
// Same contract addresses for LemonChain mainnet
export const MAINNET_CONTRACTS = {
  // Core VUSD Contracts
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  VUSDMinter: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
  USD: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  LockBox: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  MintingBridge: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  
  // Supporting Contracts
  CustodyVault: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  BankRegistry: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
  PriceOracle: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
  
  // Legacy Aliases
  LocksTreasuryVUSD: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  VUSDMinting: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  
  // Security (to be deployed)
  PriceOracleAggregator: '0x0000000000000000000000000000000000000000',
  KYCComplianceRegistry: '0x0000000000000000000000000000000000000000',
  PostQuantumSignatureVerifier: '0x0000000000000000000000000000000000000000',
  
  // Governance (to be deployed)
  DCBTimelock: '0x0000000000000000000000000000000000000000',
  DCBGovernance: '0x0000000000000000000000000000000000000000'
};

// Get contracts for current network
export function getContracts(chainId: number) {
  switch (chainId) {
    case 1005:
      return MAINNET_CONTRACTS;
    case 1006:
      return TESTNET_CONTRACTS;
    default:
      return TESTNET_CONTRACTS;
  }
}

// Get network config
export function getNetwork(chainId: number) {
  switch (chainId) {
    case 1005:
      return NETWORKS.LEMONCHAIN_MAINNET;
    case 1006:
      return NETWORKS.LEMONCHAIN_TESTNET;
    default:
      return NETWORKS.LEMONCHAIN_TESTNET;
  }
}

// Update contract addresses from deployment file
export function updateContractAddresses(deploymentData: any) {
  if (deploymentData.chainId === 1006) {
    Object.assign(TESTNET_CONTRACTS, deploymentData.contracts);
  } else if (deploymentData.chainId === 1005) {
    Object.assign(MAINNET_CONTRACTS, deploymentData.contracts);
  }
}

// Export current environment
export const IS_TESTNET = true; // Change to false for mainnet
export const CURRENT_NETWORK = IS_TESTNET ? NETWORKS.LEMONCHAIN_TESTNET : NETWORKS.LEMONCHAIN_MAINNET;
export const CURRENT_CONTRACTS = IS_TESTNET ? TESTNET_CONTRACTS : MAINNET_CONTRACTS;
