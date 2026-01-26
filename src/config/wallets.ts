/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DCB TREASURY - WALLET CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * All wallet credentials are loaded from environment variables (.env)
 * NEVER hardcode private keys in source code!
 * 
 * Roles:
 * - ADMIN: Contract deployer and system administrator
 * - DAES_SIGNER: Signs DAES/ISO 20022 injections (First Signature)
 * - BANK_SIGNER: Bank verification signature
 * - ISSUER_OPERATOR: Lock acceptance (Second Signature)
 * - APPROVER: Final approval for minting (Third Signature)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface WalletRole {
  name: string;
  address: string;
  role: string;
  description: string;
  permissions: string[];
}

export interface WalletWithKey extends WalletRole {
  privateKey: string;
  isConfigured: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET CONFIGURATION FROM ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const WALLET_CONFIG = {
  // Deployer/Admin
  admin: {
    address: import.meta.env.VITE_ADMIN_ADDRESS || '',
    privateKey: import.meta.env.VITE_ADMIN_PRIVATE_KEY || '',
    get isConfigured() {
      return !!(this.address && this.privateKey && this.privateKey !== 'YOUR_PRIVATE_KEY_HERE');
    }
  },
  
  // DAES Signer (First Signature)
  daesSigner: {
    address: import.meta.env.VITE_DAES_SIGNER_ADDRESS || '',
    privateKey: import.meta.env.VITE_DAES_SIGNER_PRIVATE_KEY || '',
    get isConfigured() {
      return !!(this.address && this.privateKey);
    }
  },
  
  // Bank Signer
  bankSigner: {
    address: import.meta.env.VITE_BANK_SIGNER_ADDRESS || '',
    privateKey: import.meta.env.VITE_BANK_SIGNER_PRIVATE_KEY || '',
    get isConfigured() {
      return !!(this.address && this.privateKey);
    }
  },
  
  // Issuer Operator (Second Signature)
  issuerOperator: {
    address: import.meta.env.VITE_ISSUER_OPERATOR_ADDRESS || '',
    privateKey: import.meta.env.VITE_ISSUER_OPERATOR_PRIVATE_KEY || '',
    get isConfigured() {
      return !!(this.address && this.privateKey);
    }
  },
  
  // Approver (Third Signature)
  approver: {
    address: import.meta.env.VITE_APPROVER_ADDRESS || '',
    privateKey: import.meta.env.VITE_APPROVER_PRIVATE_KEY || '',
    get isConfigured() {
      return !!(this.address && this.privateKey);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC WALLET INFO (NO PRIVATE KEYS - SAFE FOR UI)
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTHORIZED_WALLETS: WalletRole[] = [
  {
    name: 'Deployer/Admin',
    address: WALLET_CONFIG.admin.address,
    role: 'ADMIN',
    description: 'Contract deployer and system administrator',
    permissions: ['DEPLOY_CONTRACTS', 'UPGRADE_CONTRACTS', 'SET_ROLES', 'PAUSE_SYSTEM', 'EMERGENCY_WITHDRAW']
  },
  {
    name: 'DAES Signer',
    address: WALLET_CONFIG.daesSigner.address,
    role: 'DAES_SIGNER',
    description: 'Authorized DAES server signer for minting operations',
    permissions: ['SIGN_INJECTION', 'VERIFY_ISO_MESSAGE', 'FIRST_SIGNATURE']
  },
  {
    name: 'Bank Signer',
    address: WALLET_CONFIG.bankSigner.address,
    role: 'BANK_SIGNER',
    description: 'Bank attestation signer for lock operations',
    permissions: ['SIGN_BANK_ATTESTATION', 'VERIFY_SWIFT', 'CUSTODY_VERIFICATION']
  },
  {
    name: 'Issuer Operator',
    address: WALLET_CONFIG.issuerOperator.address,
    role: 'ISSUER_OPERATOR',
    description: 'VUSD token issuance operator',
    permissions: ['ACCEPT_LOCK', 'MOVE_TO_RESERVE', 'SECOND_SIGNATURE']
  },
  {
    name: 'Approver',
    address: WALLET_CONFIG.approver.address,
    role: 'APPROVER',
    description: 'Multi-sig approver for high-value operations',
    permissions: ['MINT_VUSD', 'GENERATE_BACKED_SIGNATURE', 'THIRD_SIGNATURE', 'FINAL_APPROVAL']
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// WALLETS WITH KEYS (FOR INTERNAL USE ONLY - SIGNING TRANSACTIONS)
// ═══════════════════════════════════════════════════════════════════════════════

export const getAuthorizedWalletsWithKeys = (): WalletWithKey[] => [
  {
    name: 'Deployer/Admin',
    address: WALLET_CONFIG.admin.address,
    privateKey: WALLET_CONFIG.admin.privateKey,
    role: 'ADMIN',
    description: 'Contract deployer and system administrator',
    permissions: ['DEPLOY_CONTRACTS', 'UPGRADE_CONTRACTS', 'SET_ROLES', 'PAUSE_SYSTEM', 'EMERGENCY_WITHDRAW'],
    isConfigured: WALLET_CONFIG.admin.isConfigured
  },
  {
    name: 'DAES Signer',
    address: WALLET_CONFIG.daesSigner.address,
    privateKey: WALLET_CONFIG.daesSigner.privateKey,
    role: 'DAES_SIGNER',
    description: 'Authorized DAES server signer for minting operations',
    permissions: ['SIGN_INJECTION', 'VERIFY_ISO_MESSAGE', 'FIRST_SIGNATURE'],
    isConfigured: WALLET_CONFIG.daesSigner.isConfigured
  },
  {
    name: 'Bank Signer',
    address: WALLET_CONFIG.bankSigner.address,
    privateKey: WALLET_CONFIG.bankSigner.privateKey,
    role: 'BANK_SIGNER',
    description: 'Bank attestation signer for lock operations',
    permissions: ['SIGN_BANK_ATTESTATION', 'VERIFY_SWIFT', 'CUSTODY_VERIFICATION'],
    isConfigured: WALLET_CONFIG.bankSigner.isConfigured
  },
  {
    name: 'Issuer Operator',
    address: WALLET_CONFIG.issuerOperator.address,
    privateKey: WALLET_CONFIG.issuerOperator.privateKey,
    role: 'ISSUER_OPERATOR',
    description: 'VUSD token issuance operator',
    permissions: ['ACCEPT_LOCK', 'MOVE_TO_RESERVE', 'SECOND_SIGNATURE'],
    isConfigured: WALLET_CONFIG.issuerOperator.isConfigured
  },
  {
    name: 'Approver',
    address: WALLET_CONFIG.approver.address,
    privateKey: WALLET_CONFIG.approver.privateKey,
    role: 'APPROVER',
    description: 'Multi-sig approver for high-value operations',
    permissions: ['MINT_VUSD', 'GENERATE_BACKED_SIGNATURE', 'THIRD_SIGNATURE', 'FINAL_APPROVAL'],
    isConfigured: WALLET_CONFIG.approver.isConfigured
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const getWalletByRole = (role: string): WalletWithKey | undefined => {
  return getAuthorizedWalletsWithKeys().find(w => w.role === role);
};

export const getWalletByAddress = (address: string): WalletWithKey | undefined => {
  return getAuthorizedWalletsWithKeys().find(
    w => w.address.toLowerCase() === address.toLowerCase()
  );
};

export const isWalletConfigured = (role: string): boolean => {
  const wallet = getWalletByRole(role);
  return wallet?.isConfigured ?? false;
};

export const getAllConfiguredWallets = (): WalletWithKey[] => {
  return getAuthorizedWalletsWithKeys().filter(w => w.isConfigured);
};

export const getConfigurationStatus = () => ({
  admin: WALLET_CONFIG.admin.isConfigured,
  daesSigner: WALLET_CONFIG.daesSigner.isConfigured,
  bankSigner: WALLET_CONFIG.bankSigner.isConfigured,
  issuerOperator: WALLET_CONFIG.issuerOperator.isConfigured,
  approver: WALLET_CONFIG.approver.isConfigured,
  allConfigured: 
    WALLET_CONFIG.admin.isConfigured &&
    WALLET_CONFIG.daesSigner.isConfigured &&
    WALLET_CONFIG.bankSigner.isConfigured &&
    WALLET_CONFIG.issuerOperator.isConfigured &&
    WALLET_CONFIG.approver.isConfigured
});

// Log configuration status (only addresses, never keys)
console.log('[Wallets Config] Loaded from .env:', {
  admin: WALLET_CONFIG.admin.address || '❌ NOT SET',
  daesSigner: WALLET_CONFIG.daesSigner.address || '❌ NOT SET',
  bankSigner: WALLET_CONFIG.bankSigner.address || '❌ NOT SET',
  issuerOperator: WALLET_CONFIG.issuerOperator.address || '❌ NOT SET',
  approver: WALLET_CONFIG.approver.address || '❌ NOT SET',
  status: getConfigurationStatus()
});

export default WALLET_CONFIG;
