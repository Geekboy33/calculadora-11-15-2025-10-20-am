/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔗 DCB TREASURY - SMART CONTRACTS CONFIGURATION                                                 ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// Network configurations
export const NETWORKS = {
  LEMONCHAIN_MAINNET: {
    chainId: 1005,
    name: 'LemonChain Mainnet',
    rpcUrl: 'https://rpc.lemonchain.io',
    explorer: 'https://explorer.lemonchain.io',
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
    explorer: 'https://testnet.explorer.lemonchain.io',
    currency: {
      name: 'LEMON',
      symbol: 'LEMON',
      decimals: 18
    }
  }
};

// Contract addresses - LemonChain (Chain ID: 1006)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// DCB Treasury V5 - DEPLOYED & VERIFIED - January 2026
// All contracts verified on https://explorer.lemonchain.io
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const TESTNET_CONTRACTS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // CORE VUSD CONTRACTS - V5 DEPLOYED & VERIFIED
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  
  // VUSD Token - Main stablecoin (ERC-20, 6 decimals)
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // PriceOracle - Real-time price feeds (USD, VUSD, USDT, USDC) - Chainlink compatible
  // https://explorer.lemonchain.io/address/0xbc3335ef43f2D95e26F4848AC86480294cB756bC
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',
  
  // USDTokenized - First signature, ISO 20022 & SWIFT support
  // https://explorer.lemonchain.io/address/0x602FbeBDe6034d34BB2497AB5fa261383f87d04f
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  
  // LockReserve - Second signature, secure custody for locked USD
  // https://explorer.lemonchain.io/address/0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  LockBox: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021', // Alias
  
  // VUSDMinter - Third signature, final minting authorization with backed certificate
  // https://explorer.lemonchain.io/address/0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  
  // MultichainBridge - Cross-chain VUSD transfers
  // https://explorer.lemonchain.io/address/0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531',
  MintingBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531', // Alias
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // LEGACY ALIASES (for backward compatibility)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  LocksTreasuryVUSD: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021', // Same as LockReserve
  VUSDMinting: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC', // Same as VUSDMinter
  
  // Legacy contracts (no longer used in v5)
  CustodyVault: '',
  BankRegistry: '',
  
  // Security contracts (to be deployed)
  PriceOracleAggregator: '',
  KYCComplianceRegistry: '',
  DCBTimelock: '',
  PostQuantumSignatureVerifier: '',
  
  // Governance (to be deployed)
  DCBGovernance: ''
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// AUTHORIZED WALLETS FOR VUSD ECOSYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const AUTHORIZED_WALLETS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY ADMIN - Main deployer with ALL ROLES
  // This wallet has MINTER_ROLE assigned in the contract constructor
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  DCB_TREASURY_ADMIN: {
    address: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
    description: 'Main deployer and administrator - has MINTER_ROLE',
    roles: [
      'DEFAULT_ADMIN_ROLE',   // Can grant/revoke all roles
      'MINTER_ROLE',          // Can inject USD and mint tokens
      'BANK_SIGNER_ROLE',     // Can sign bank certifications
      'DAES_OPERATOR_ROLE',   // Can inject from DAES
      'COMPLIANCE_ROLE'       // Can manage KYC/blacklist
    ],
    assignedInConstructor: true
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // VUSD MINTER CONTRACT - Reference address for VUSDMinter contract
  // This is a CONTRACT address, not a wallet with roles
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  VUSD_MINTER_CONTRACT: {
    address: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    description: 'VUSDMinter contract address (referenced in USDTokenized as VUSD_MINTER_WALLET constant)',
    isContract: true,
    roles: [] // No roles assigned - this is just a reference constant
  }
};

// Contract addresses - MAINNET (LemonChain Chain ID: 1006)
// DCB Treasury V5 - DEPLOYED & VERIFIED - January 2026
export const MAINNET_CONTRACTS = {
  // Core VUSD Contracts - V5
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  LockBox: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531',
  MintingBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531',
  
  // Legacy Aliases
  LocksTreasuryVUSD: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinting: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  
  // Legacy (no longer used in v5)
  CustodyVault: '',
  BankRegistry: '',
  
  // Security (to be deployed)
  PriceOracleAggregator: '',
  KYCComplianceRegistry: '',
  DCBTimelock: '',
  PostQuantumSignatureVerifier: '',
  DCBGovernance: ''
};

// Get contracts for current network
export const getContracts = (chainId: number) => {
  if (chainId === 1006) {
    return TESTNET_CONTRACTS;
  }
  return MAINNET_CONTRACTS;
};

// Contract ABIs (simplified for frontend)
export const CONTRACT_ABIS = {
  USD: [
    // Read functions
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function totalCustodyBalance() view returns (uint256)',
    'function totalLockedForVUSD() view returns (uint256)',
    'function totalInjections() view returns (uint256)',
    'function getStatistics() view returns (uint256, uint256, uint256, uint256)',
    'function getRateLimitStatus() view returns (uint256, uint256, uint256, uint256, bool)',
    'function custodyAccounts(bytes32) view returns (tuple(bytes32,string,string,string,string,uint256,uint256,bool,address,uint256,uint256))',
    'function injections(bytes32) view returns (tuple(bytes32,bytes32,uint256,uint8,string,bytes32,string,string,string,bytes32,bytes32,string,uint8,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes32,bytes32,string))',
    
    // Write functions
    'function createCustodyAccount(string,string,string,string) returns (bytes32)',
    'function recordCustodyDeposit(bytes32,uint256)',
    'function initiateInjection(bytes32,uint256,address,string) returns (bytes32)',
    'function cancelInjection(bytes32,string)',
    
    // Events
    'event CustodyAccountCreated(bytes32 indexed, string, string, string, address indexed, uint256)',
    'event CustodyDeposit(bytes32 indexed, uint256, uint256, uint256)',
    'event USDInjectionInitiated(bytes32 indexed, bytes32 indexed, uint256, address indexed, string, uint256, uint256)',
    'event CircuitBreakerTriggered(uint256, uint256)',
    'event CircuitBreakerReset(address, uint256)'
  ],
  
  LocksTreasuryVUSD: [
    // Read functions
    'function totalLocked() view returns (uint256)',
    'function totalAvailableForMinting() view returns (uint256)',
    'function totalConsumedForVUSD() view returns (uint256)',
    'function totalLocks() view returns (uint256)',
    'function locks(bytes32) view returns (tuple(bytes32,bytes32,string,uint256,uint256,uint256,uint256,address,address,address,uint8,bytes32,bytes32,bytes32,uint256,uint256,uint256,uint256,bytes32[],uint256[]))',
    'function getLockByAuthCode(string) view returns (tuple)',
    'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
    'function verifySignatures(bytes32) view returns (bool, bool, bool, bytes32, bytes32, bytes32)',
    
    // Write functions
    'function receiveLock(bytes32,string,uint256,address,bytes32) returns (bytes32)',
    'function acceptLock(bytes32) returns (bytes32)',
    'function moveToReserve(bytes32)',
    'function approvePartialAmount(bytes32,uint256)',
    'function consumeForMinting(bytes32,uint256,bytes32,string) returns (bytes32, bytes32)',
    
    // Events
    'event LockReceived(bytes32 indexed, bytes32 indexed, string, uint256, address indexed, uint256)',
    'event LockAccepted(bytes32 indexed, address indexed, bytes32, uint256)',
    'event LockMovedToReserve(bytes32 indexed, uint256, uint256)',
    'event PartialAmountApproved(bytes32 indexed, uint256, uint256, uint256)',
    'event LockConsumedForMinting(bytes32 indexed, bytes32 indexed, uint256, bytes32, bytes32, address indexed, string, uint256)',
    'event LockFullyConsumed(bytes32 indexed, uint256, uint256)'
  ],
  
  VUSDMinting: [
    // Read functions
    'function totalMinted() view returns (uint256)',
    'function totalMintOperations() view returns (uint256)',
    'function totalExplorerEntries() view returns (uint256)',
    'function explorerEntries(bytes32) view returns (tuple)',
    'function getEntryByPublicationCode(string) view returns (tuple)',
    'function getEntryByLockId(bytes32) view returns (tuple)',
    'function getRecentEntries(uint256) view returns (tuple[])',
    'function getStatistics() view returns (uint256, uint256, uint256, uint256)',
    'function verifyEntrySignatures(bytes32) view returns (bool, bytes32, bytes32, bytes32)',
    'function getAuditTrail(bytes32) view returns (bytes32, bytes32, bytes32, uint256, uint256, string, string, bytes32, bytes32, bytes32, uint256, uint256, uint256)',
    
    // Write functions
    'function createMintRequest(bytes32,uint256,string) returns (bytes32)',
    'function executeMint(bytes32,bytes32,uint256,string,string,bytes32,uint256,uint256,bytes32,bytes32) returns (bytes32, string)',
    'function mintAndPublish(bytes32,uint256,address,bytes32,string,string,bytes32,bytes32) returns (bytes32, string)',
    
    // Events
    'event MintRequestCreated(bytes32 indexed, bytes32 indexed, uint256, address indexed, string, uint256)',
    'event VUSDMinted(bytes32 indexed, bytes32 indexed, string, uint256, address indexed, uint256)',
    'event PublishedToMintExplorer(bytes32 indexed, string, bytes32, uint256, address, bytes32, bytes32, bytes32, uint256)',
    'event CompleteAuditTrail(bytes32 indexed, bytes32, bytes32, bytes32, uint256, uint256, string, string, uint256)'
  ],
  
  PostQuantumSignatureVerifier: [
    // Read functions
    'function verificationMode() view returns (uint8)',
    'function defaultAlgorithm() view returns (uint8)',
    'function totalKeys() view returns (uint256)',
    'function totalVerifications() view returns (uint256)',
    'function pqcPublicKeys(bytes32) view returns (tuple)',
    'function trustedVerifiers(address) view returns (bool)',
    'function getPublicKey(bytes32) view returns (tuple)',
    'function getOwnerKeys(address) view returns (bytes32[])',
    'function getActiveKeyForOwner(address) view returns (bytes32)',
    'function getAlgorithmName(uint8) view returns (string)',
    'function getStatistics() view returns (uint256, uint256, uint8, uint8)',
    
    // Write functions
    'function registerPublicKey(address,uint8,bytes,uint256,string) returns (bytes32)',
    'function revokePublicKey(bytes32,string)',
    'function verifyPQCSignature(bytes32,bytes32,bytes32,bytes) returns (bool)',
    'function setVerificationMode(uint8)',
    'function setTrustedVerifier(address,bool)',
    'function activateQuantumEmergency()',
    
    // Events
    'event PQCPublicKeyRegistered(bytes32 indexed, address indexed, uint8, bytes32, uint256)',
    'event PQCPublicKeyRevoked(bytes32 indexed, address indexed, string)',
    'event SignatureVerified(bytes32 indexed, bytes32 indexed, address indexed, uint8, bool, bool)',
    'event VerificationModeChanged(uint8, uint8)',
    'event QuantumThreatLevelUpdated(uint8, uint8, string)'
  ],
  
  KYCComplianceRegistry: [
    // Read functions
    'function isVerified(address) view returns (bool)',
    'function getKYCLevel(address) view returns (uint8)',
    'function kycRecords(address) view returns (tuple)',
    'function blacklist(address) view returns (bool)',
    'function whitelist(address) view returns (bool)',
    'function isTransactionAllowed(address,uint256,string) view returns (bool, string)',
    'function getKYCRecord(address) view returns (tuple)',
    'function getAccountLimits(address) view returns (uint256, uint256, uint256, uint256, uint256)',
    
    // Write functions
    'function verifyAccount(address,uint8,bytes2,bytes32,bytes32,bytes32,bool,bool,bool,uint256,uint256,uint256)',
    'function updateKYCLevel(address,uint8,string)',
    'function addToBlacklist(address,string)',
    'function removeFromBlacklist(address)',
    'function addToWhitelist(address)',
    'function removeFromWhitelist(address)',
    
    // Events
    'event KYCVerified(address indexed, uint8, bytes2, address indexed, uint256)',
    'event KYCUpdated(address indexed, uint8, uint8, address indexed)',
    'event AccountStatusChanged(address indexed, uint8, uint8, string)',
    'event AddressBlacklisted(address indexed, string, address indexed)'
  ],
  
  DCBGovernance: [
    // Read functions
    'function proposalCount() view returns (uint256)',
    'function totalVotingPower() view returns (uint256)',
    'function votingPeriod() view returns (uint256)',
    'function votingDelay() view returns (uint256)',
    'function proposals(uint256) view returns (tuple)',
    'function state(uint256) view returns (uint8)',
    'function getProposal(uint256) view returns (tuple)',
    'function getVote(uint256,address) view returns (tuple)',
    'function getVotingPower(address) view returns (uint256)',
    'function getAllProposalIds() view returns (uint256[])',
    'function getActiveProposals() view returns (uint256[])',
    'function quorumVotes() view returns (uint256)',
    
    // Write functions
    'function propose(address[],uint256[],bytes[],string[],string,string,uint8) returns (uint256)',
    'function castVote(uint256,uint8,string)',
    'function queue(uint256)',
    'function execute(uint256)',
    'function cancel(uint256)',
    'function delegate(address)',
    'function setVotingPower(address,uint256)',
    
    // Events
    'event ProposalCreated(uint256 indexed, address indexed, string, uint8, uint256, uint256)',
    'event VoteCast(uint256 indexed, address indexed, uint8, uint256, string)',
    'event ProposalCanceled(uint256 indexed, address)',
    'event ProposalQueued(uint256 indexed, uint256)',
    'event ProposalExecuted(uint256 indexed, address)'
  ],
  
  DCBTimelock: [
    // Read functions
    'function delay() view returns (uint256)',
    'function totalOperations() view returns (uint256)',
    'function operations(bytes32) view returns (tuple)',
    'function getOperationState(bytes32) view returns (uint8)',
    'function isOperationReady(bytes32) view returns (bool)',
    'function getEmergencyApprovals(bytes32) view returns (uint256)',
    
    // Write functions
    'function schedule(address,uint256,bytes,bytes32,bytes32,string) returns (bytes32)',
    'function scheduleCritical(address,uint256,bytes,bytes32,bytes32,string) returns (bytes32)',
    'function execute(bytes32)',
    'function cancel(bytes32)',
    'function scheduleEmergency(address,uint256,bytes,string) returns (bytes32)',
    'function approveEmergency(bytes32)',
    'function executeEmergency(bytes32)',
    
    // Events
    'event OperationScheduled(bytes32 indexed, address indexed, uint256, bytes, bytes32, uint256, uint256, uint8, string)',
    'event OperationExecuted(bytes32 indexed, address indexed, uint256, bytes, address)',
    'event OperationCancelled(bytes32 indexed, address)',
    'event EmergencyApproval(bytes32 indexed, address indexed, uint256)',
    'event EmergencyExecuted(bytes32 indexed, address)'
  ]
};

// Helper to load deployed contracts from file
export const loadDeployedContracts = async (): Promise<typeof TESTNET_CONTRACTS | null> => {
  try {
    const response = await fetch('/deployed-contracts-testnet.json');
    if (response.ok) {
      const data = await response.json();
      return data.contracts;
    }
  } catch (error) {
    console.warn('Could not load deployed contracts:', error);
  }
  return null;
};

// Export default configuration
export default {
  NETWORKS,
  TESTNET_CONTRACTS,
  MAINNET_CONTRACTS,
  CONTRACT_ABIS,
  getContracts,
  loadDeployedContracts
};
