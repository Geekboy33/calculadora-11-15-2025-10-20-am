/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║  VUSD TREASURY SYSTEM v5.0 - FRONTEND CONFIGURATION                                              ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  This file contains the configuration for DCB Treasury and Treasury Minting frontends            ║
 * ║  to interact with the new quantum-secure VUSD smart contracts.                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const LEMONCHAIN_CONFIG = {
  chainId: 1006,
  chainIdHex: '0x3EE',
  chainName: 'LemonChain Mainnet',
  rpcUrl: 'https://rpc.lemonchain.io',
  blockExplorerUrl: 'https://explorer.lemonchain.io',
  nativeCurrency: {
    name: 'LEMON',
    symbol: 'LEMON',
    decimals: 18
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES - UPDATE AFTER DEPLOYMENT
// ══════════════════════════════════════════════════════════════════════════════

export const CONTRACT_ADDRESSES = {
  // Official VUSD Token - LemonChain Mainnet
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // DCB Treasury v5 Contracts - DEPLOYED & VERIFIED ON LEMONCHAIN (Chain ID: 1006) - Jan 2026
  // All contracts verified on https://explorer.lemonchain.io
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',           // USDTokenized (First Signature)
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',   // LockReserve (Second Signature)
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',    // VUSDMinter (Third Signature)
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531', // Cross-chain bridge
};

// ══════════════════════════════════════════════════════════════════════════════
// WALLET CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const MINTER_WALLET = '0xaccA35529b2FC2041dFb124F83f52120E24377B2';

// ══════════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  DAES_OPERATOR_ROLE: '0x4441455320524f4c450000000000000000000000000000000000000000000000',
  TREASURY_MINTING_ROLE: '0x54524541535552595f4d494e54494e475f524f4c45000000000000000000000',
  ISO20022_PROCESSOR_ROLE: '0x49534f32303032325f50524f434553534f525f524f4c4500000000000000000',
  QUANTUM_SIGNER_ROLE: '0x5155414e54554d5f5349474e45525f524f4c4500000000000000000000000000',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929',
  VUSD_MINTING_ROLE: '0x565553445f4d494e54494e475f524f4c45000000000000000000000000000000',
  CERTIFICATE_ISSUER_ROLE: '0x4345525449464943415445204953535545520000000000000000000000000000',
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT ABIs (Simplified for frontend use)
// ══════════════════════════════════════════════════════════════════════════════

export const PRICE_ORACLE_ABI = [
  // Read functions
  "function getPrice(string symbol) view returns (int256)",
  "function getUSDPrice() view returns (int256)",
  "function getVUSDPrice() view returns (int256)",
  "function getUSDTPrice() view returns (int256)",
  "function getUSDCPrice() view returns (int256)",
  "function getAllStablecoinPrices() view returns (int256, int256, int256, int256, uint256)",
  "function getPriceData(string symbol) view returns (int256, uint256, uint80, bool, uint8)",
  "function getSupportedTokens() view returns (string[])",
  "function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)",
  // Write functions
  "function updatePrice(string symbol, int256 newPrice, uint8 sourceCount)",
  "function updateFromChainlink(string symbol)",
  "function updatePriceQuantumSecure(string symbol, int256 newPrice, bytes quantumSig, address signer)",
  "function processISO20022Message(bytes32 messageId, string msgType, string currency, int256 price, bytes32 senderBIC, bytes32 receiverBIC, bytes signature) returns (bool)",
  // Events
  "event PriceUpdated(string indexed symbol, int256 price, uint80 roundId, uint256 timestamp, address indexed updater, uint8 sourceCount)",
  "event ISO20022MessageProcessed(bytes32 indexed messageId, string msgType, string currency, int256 price)",
  "event QuantumSignatureVerified(bytes32 indexed dataHash, address indexed signer, uint256 timestamp)"
];

export const USD_TOKENIZED_ABI = [
  // ERC20 standard
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  // Injection functions
  "function injectFromDAES(uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash) returns (bytes32)",
  "function injectFromISO20022(string messageType, bytes32 endToEndId, bytes32 instructionId, string senderBIC, string receiverBIC, string senderIBAN, string receiverIBAN, uint256 amount, string currency, string remittanceInfo, address beneficiary, bytes32 xmlHash) returns (bytes32, bytes32)",
  "function addQuantumSignature(bytes32 injectionId, bytes quantumSig)",
  "function acceptInjection(bytes32 injectionId) returns (bool)",
  "function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) returns (bool)",
  "function recordConsumptionForVUSD(bytes32 injectionId, bytes32 vusdTxHash) returns (bool)",
  "function cancelInjection(bytes32 injectionId, string reason)",
  // View functions
  "function getInjection(bytes32 injectionId) view returns (uint256, address, uint8, bytes32, bytes32, uint256, string, bytes32)",
  "function getISO20022Injection(bytes32 messageId) view returns (string, bytes32, string, string, uint256, uint8)",
  "function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getInjectionCount() view returns (uint256)",
  // Events
  "event USDInjected(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary, bytes32 dcbSignature, string daesTransactionId, uint256 timestamp)",
  "event InjectionAccepted(bytes32 indexed injectionId, address indexed acceptedBy, uint256 timestamp)",
  "event MovedToLockReserve(bytes32 indexed injectionId, bytes32 indexed lockReserveId, uint256 amount, uint256 timestamp)",
  "event ConsumedForVUSD(bytes32 indexed injectionId, uint256 amount, bytes32 vusdTxHash, uint256 timestamp)",
  "event ISO20022MessageReceived(bytes32 indexed messageId, string messageType, string senderBIC, uint256 amount, uint256 timestamp)",
  "event QuantumSignatureGenerated(bytes32 indexed injectionId, bytes32 quantumSignature, address indexed signer, uint256 timestamp)"
];

export const LOCK_RESERVE_ABI = [
  // Lock functions
  "function receiveLock(bytes32 usdInjectionId, uint256 amount, address beneficiary, bytes32 firstSignature) returns (bytes32)",
  "function receiveLockWithISO20022(bytes32 usdInjectionId, uint256 amount, address beneficiary, bytes32 firstSignature, bytes32 iso20022MessageId) returns (bytes32)",
  "function acceptLock(bytes32 lockId) returns (bytes32, string)",
  "function addQuantumSignature(bytes32 lockId, uint8 signatureIndex, bytes quantumSig)",
  "function moveToReserve(bytes32 lockId)",
  "function consumeForVUSD(bytes32 lockId, uint256 amount, bytes32 vusdTxHash) returns (bytes32, bytes32)",
  "function cancelLock(bytes32 lockId, string reason)",
  // View functions
  "function getLockByAuthCode(string authCode) view returns (bytes32)",
  "function getLockByISO20022(bytes32 messageId) view returns (bytes32)",
  "function getAvailableReserve(bytes32 lockId) view returns (uint256)",
  "function verifySignatures(bytes32 lockId) view returns (bool, bool, bool, bytes32, bytes32, bytes32)",
  "function verifyQuantumSignatures(bytes32 lockId) view returns (bool, bool, bool, bytes32, bytes32, bytes32)",
  "function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)",
  "function getLock(bytes32 lockId) view returns (bytes32, uint256, uint256, address, uint8, string, bytes32)",
  // Events
  "event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, uint256 amount, address indexed beneficiary, bytes32 firstSignature, uint256 timestamp)",
  "event LockAccepted(bytes32 indexed lockId, address indexed acceptedBy, bytes32 secondSignature, string authorizationCode, uint256 timestamp)",
  "event MovedToReserve(bytes32 indexed lockId, uint256 amount, uint256 timestamp)",
  "event ReserveConsumedForVUSD(bytes32 indexed lockId, bytes32 indexed consumptionId, uint256 amount, bytes32 thirdSignature, uint256 timestamp)",
  "event QuantumSignatureAdded(bytes32 indexed lockId, uint8 signatureIndex, bytes32 quantumSignature, address indexed signer, uint256 timestamp)"
];

export const VUSD_MINTER_ABI = [
  // Minting functions
  "function createMintRequest(bytes32 lockReserveId, uint256 amount, address beneficiary, string authorizationCode) returns (bytes32)",
  "function generateBackedSignatureAndMint(bytes32 lockReserveId, uint256 amount, address beneficiary, bytes32 emisorTxHash) returns (bytes32, bytes32, string)",
  "function generateQuantumBackedSignature(bytes32 lockReserveId, uint256 amount, address beneficiary, bytes32 emisorTxHash, bytes quantumProof) returns (bytes32, bytes32, bytes32, string)",
  "function executeMintRequest(bytes32 requestId, bytes32 emisorTxHash) returns (bytes32)",
  "function createISO20022Settlement(bytes32 certificateId, string messageType, string senderBIC, string receiverBIC) returns (bytes32)",
  // View functions
  "function getCertificate(bytes32 certificateId) view returns (bytes32, uint256, uint256, address, bytes32, bytes32, uint256, string, bool)",
  "function getCertificateSignatures(bytes32 certificateId) view returns (bytes32, bytes32, bytes32, bytes32, bytes32)",
  "function getCertificateByPublicationCode(string code) view returns (bytes32)",
  "function getCertificateByLock(bytes32 lockId) view returns (bytes32)",
  "function verifyCertificate(bytes32 certificateId) view returns (bool, bool, bool, uint256, uint256, int256)",
  "function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getMintRequest(bytes32 requestId) view returns (bytes32, uint256, address, bool, uint256, string)",
  "function getISO20022Settlement(bytes32 settlementId) view returns (bytes32, string, string, string, uint256, bool)",
  // Events
  "event VUSDMinted(bytes32 indexed certificateId, address indexed beneficiary, uint256 vusdAmount, uint256 usdBacking, bytes32 backedSignature, string publicationCode, uint256 timestamp)",
  "event BackedCertificateIssued(bytes32 indexed certificateId, bytes32 indexed lockReserveId, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, uint256 timestamp)",
  "event QuantumCertificateIssued(bytes32 indexed certificateId, bytes32 quantumSignature, address indexed issuer, uint256 timestamp)",
  "event MintRequestCreated(bytes32 indexed requestId, bytes32 indexed lockReserveId, uint256 amount, address indexed beneficiary, uint256 timestamp)",
  "event MintRequestExecuted(bytes32 indexed requestId, bytes32 indexed certificateId, uint256 timestamp)",
  "event ISO20022SettlementCreated(bytes32 indexed settlementId, bytes32 indexed certificateId, string messageType, uint256 amount, uint256 timestamp)"
];

export const VUSD_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function burnFrom(address account, uint256 amount)"
];

export const MULTICHAIN_BRIDGE_ABI = [
  // Read functions
  "function totalLocked() view returns (uint256)",
  "function totalReleased() view returns (uint256)",
  "function supportedChains(uint256 chainId) view returns (bool)",
  "function getBridgeTransaction(bytes32 txId) view returns (tuple)",
  "function getStatistics() view returns (uint256, uint256, uint256, uint256)",
  "function validatorCount() view returns (uint256)",
  "function requiredSignatures() view returns (uint256)",
  // Write functions
  "function lockForBridge(uint256 amount, uint256 targetChainId, address targetAddress) returns (bytes32)",
  "function releaseFromBridge(bytes32 bridgeTxId, uint256 amount, address recipient, bytes[] signatures) returns (bool)",
  "function addSupportedChain(uint256 chainId, string chainName)",
  "function removeSupportedChain(uint256 chainId)",
  "function addValidator(address validator)",
  "function removeValidator(address validator)",
  // Events
  "event TokensLocked(bytes32 indexed txId, address indexed sender, uint256 amount, uint256 targetChainId, address targetAddress, uint256 timestamp)",
  "event TokensReleased(bytes32 indexed txId, address indexed recipient, uint256 amount, uint256 sourceChainId, uint256 timestamp)",
  "event ChainAdded(uint256 indexed chainId, string chainName)",
  "event ChainRemoved(uint256 indexed chainId)",
  "event ValidatorAdded(address indexed validator)",
  "event ValidatorRemoved(address indexed validator)"
];

// ══════════════════════════════════════════════════════════════════════════════
// ISO 20022 MESSAGE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const ISO20022_MESSAGE_TYPES = {
  PACS_008: 'pacs.008', // FI to FI Customer Credit Transfer
  PACS_009: 'pacs.009', // FI Credit Transfer
  CAMT_053: 'camt.053', // Bank to Customer Statement
  CAMT_054: 'camt.054', // Bank to Customer Debit/Credit Notification
  PAIN_001: 'pain.001', // Customer Credit Transfer Initiation
  PAIN_002: 'pain.002', // Customer Payment Status Report
};

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORTED CURRENCIES (ISO 4217)
// ══════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, flag: '🇨🇭' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2, flag: '🇸🇦' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2, flag: '🇲🇽' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, flag: '🇨🇦' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, flag: '🇭🇰' },
];

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORTED STABLECOINS
// ══════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_STABLECOINS = [
  { symbol: 'VUSD', name: 'Verified USD', issuer: 'Digital Commercial Bank', backed: true },
  { symbol: 'USDT', name: 'Tether USD', issuer: 'Tether', backed: true },
  { symbol: 'USDC', name: 'USD Coin', issuer: 'Circle', backed: true },
];

// ══════════════════════════════════════════════════════════════════════════════
// SIGNATURE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const SIGNATURE_TYPES = {
  FIRST_SIGNATURE: {
    name: 'DCB/DAES First Signature',
    description: 'Generated when USD is injected from DAES custody',
    prefix: 'DCB_TREASURY_DAES_FIRST_SIGNATURE_v5'
  },
  SECOND_SIGNATURE: {
    name: 'Treasury Minting Second Signature',
    description: 'Generated when lock is accepted in Treasury Minting',
    prefix: 'TREASURY_MINTING_SECOND_SIGNATURE_v5'
  },
  THIRD_SIGNATURE: {
    name: 'VUSD Minting Third Signature',
    description: 'Generated when VUSD is minted (Backed Certificate)',
    prefix: 'VUSD_MINTING_THIRD_SIGNATURE_BACKED_v5'
  },
  QUANTUM_SIGNATURE: {
    name: 'Quantum-Resistant Signature',
    description: 'Post-quantum cryptography signature for future-proofing',
    prefix: 'QUANTUM_SECURE_'
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export function formatAmount(amount: bigint | number, decimals: number = 6): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const decPart = value % divisor;
  return `${intPart}.${decPart.toString().padStart(decimals, '0')}`;
}

export function parseAmount(amount: string, decimals: number = 6): bigint {
  const [intPart, decPart = ''] = amount.split('.');
  const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(intPart + paddedDec);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function generateXMLHash(xmlContent: string): string {
  // Simple hash for demo - in production use proper crypto
  let hash = 0;
  for (let i = 0; i < xmlContent.length; i++) {
    const char = xmlContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export default {
  LEMONCHAIN_CONFIG,
  CONTRACT_ADDRESSES,
  MINTER_WALLET,
  ROLES,
  PRICE_ORACLE_ABI,
  USD_TOKENIZED_ABI,
  LOCK_RESERVE_ABI,
  VUSD_MINTER_ABI,
  VUSD_TOKEN_ABI,
  MULTICHAIN_BRIDGE_ABI,
  ISO20022_MESSAGE_TYPES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_STABLECOINS,
  SIGNATURE_TYPES
};
