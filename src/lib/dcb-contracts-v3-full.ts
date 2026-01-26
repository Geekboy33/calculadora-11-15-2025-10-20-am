
// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY v3.0 - FULL DEPLOYED CONTRACT ADDRESSES
// Generated: 2026-01-15T19:04:37.466Z
// Network: LemonChain (Chain ID: 1006)
// ═══════════════════════════════════════════════════════════════════════════════

export const DCB_CONTRACTS_V3_FULL = {
  // Network
  CHAIN_ID: 1006,
  NETWORK_NAME: 'LemonChain Mainnet',
  RPC_URL: 'https://rpc.lemonchain.io',
  EXPLORER: 'https://explorer.lemonchain.io',
  
  // Core Contracts - v5.0 Deployed
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  PRICE_ORACLE: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
  BANK_REGISTRY: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
  LOCK_BOX: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  USD: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  VUSD_MINTER: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
  
  // DCB Treasury Flow Contracts
  CUSTODY_VAULT: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  MINTING_BRIDGE: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
} as const;

export const OFFICIAL_VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';

// DCB Treasury Flow
export const DCB_TREASURY_FLOW = {
  STEP_1: 'Select M1 Custody Account with USD funds',
  STEP_2: 'Create CustodyVault on blockchain',
  STEP_3: 'Create Lock with bank signature (EIP-712)',
  STEP_4: 'Consume & Mint generates authorization code (MINT-XXXX-YYYY)',
  STEP_5: 'LEMX MintingBridge verifies and mints VUSD',
  STEP_6: 'Publication in Mint Explorer with TX hash'
} as const;
