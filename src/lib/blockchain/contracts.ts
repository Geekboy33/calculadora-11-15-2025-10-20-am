// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN CONTRACTS SERVICE - Treasury Minting LemonChain Platform
// Interacts with deployed smart contracts on LemonChain
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LEMONCHAIN NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export const LEMONCHAIN_CONFIG = {
  chainId: 1006,
  chainIdHex: '0x3EE',
  name: 'LemonChain Mainnet',
  rpcUrl: 'https://rpc.lemonchain.io',
  wssUrl: 'wss://ws.lemonchain.io',
  explorerUrl: 'https://explorer.lemonchain.io',
  nativeCurrency: {
    name: 'LEMON',
    symbol: 'LEMON',
    decimals: 18
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export const CONTRACT_ADDRESSES = {
  // Official VUSD Contract - LemonChain Mainnet
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // DCB Treasury v5.0 Contracts - Deployed on LemonChain
  LockBox: import.meta.env.VITE_LOCKBOX_ADDRESS || '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  CustodyVault: import.meta.env.VITE_CUSTODY_VAULT_ADDRESS || '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  LocksTreasuryVUSD: import.meta.env.VITE_LOCKS_TREASURY_ADDRESS || '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  VUSDMinting: import.meta.env.VITE_VUSD_MINTING_ADDRESS || '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
  MintingBridge: import.meta.env.VITE_MINTING_BRIDGE_ADDRESS || '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  BankRegistry: import.meta.env.VITE_BANK_REGISTRY_ADDRESS || '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
  PriceOracle: import.meta.env.VITE_PRICE_ORACLE_ADDRESS || '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
  USDTokenized: import.meta.env.VITE_USD_TOKENIZED_ADDRESS || '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONTRACT ABIs (Simplified versions for frontend interaction)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// VUSD Token ABI (ERC-20 + Mint/Burn)
export const VUSD_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

// LockBox ABI
export const LOCKBOX_ABI = [
  // Constants
  'function VERSION() view returns (string)',
  'function VUSD_CONTRACT() view returns (address)',
  'function MIN_LOCK_DURATION() view returns (uint256)',
  'function MAX_LOCK_DURATION() view returns (uint256)',
  'function EMERGENCY_PENALTY_BPS() view returns (uint256)',
  
  // State
  'function admin() view returns (address)',
  'function paused() view returns (bool)',
  'function lockCount() view returns (uint256)',
  'function totalLocked() view returns (uint256)',
  'function totalReleased() view returns (uint256)',
  
  // Lock Functions
  'function lockVUSD(address beneficiary, uint256 amount, uint256 duration, string refId) returns (uint256 lockId)',
  'function releaseVUSD(uint256 lockId)',
  'function partialRelease(uint256 lockId, uint256 amount)',
  'function emergencyWithdraw(uint256 lockId)',
  
  // Vesting Functions
  'function createVestingLock(address beneficiary, uint256 amount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 slicePeriod, bool revocable, string refId) returns (uint256 lockId)',
  'function claimVested(uint256 lockId)',
  'function getReleasableAmount(uint256 lockId) view returns (uint256)',
  
  // Multi-sig Functions
  'function createMultiSigLock(address beneficiary, uint256 amount, uint256 duration, address[] signers, uint256 requiredApprovals, string refId) returns (uint256 lockId)',
  'function approveMultiSigRelease(uint256 lockId)',
  
  // View Functions
  'function getLock(uint256 lockId) view returns (tuple(uint256 id, address depositor, address beneficiary, uint256 amount, uint256 originalAmount, uint256 lockTime, uint256 unlockTime, uint8 status, uint8 lockType, string refId, bytes32 txHash))',
  'function getUserLocks(address user) view returns (uint256[])',
  'function getBeneficiaryLocks(address beneficiary) view returns (uint256[])',
  'function getStatistics() view returns (uint256 lockCount, uint256 totalLocked, uint256 totalReleased, uint256 totalEmergencyWithdrawals, uint256 totalPenaltiesCollected)',
  'function getVUSDBalance() view returns (uint256)',
  
  // Events
  'event VUSDLocked(uint256 indexed lockId, address indexed depositor, address indexed beneficiary, uint256 amount, uint256 unlockTime, uint8 lockType, string refId)',
  'event VUSDReleased(uint256 indexed lockId, address indexed beneficiary, uint256 amount, address indexed releasedBy, uint256 timestamp)',
  'event EmergencyWithdrawal(uint256 indexed lockId, address indexed depositor, uint256 amountReturned, uint256 penaltyAmount, uint256 timestamp)'
];

// LocksTreasuryVUSD ABI (Second Signature Contract)
export const LOCKS_TREASURY_ABI = [
  // Constants
  'function VERSION() view returns (string)',
  'function CONTRACT_NAME() view returns (string)',
  'function VUSD_CONTRACT() view returns (address)',
  
  // State
  'function totalLocked() view returns (uint256)',
  'function totalAvailableForMinting() view returns (uint256)',
  'function totalConsumedForVUSD() view returns (uint256)',
  'function totalLocks() view returns (uint256)',
  
  // Lock Receiving
  'function receiveLock(bytes32 usdInjectionId, string authorizationCode, uint256 amount, address beneficiary, bytes32 firstSignatureHash) returns (bytes32 lockId)',
  
  // Lock Acceptance (SECOND SIGNATURE)
  'function acceptLock(bytes32 lockId) returns (bytes32 secondSignatureHash)',
  'function moveToReserve(bytes32 lockId)',
  'function approvePartialAmount(bytes32 lockId, uint256 amount)',
  
  // Minting Consumption (THIRD SIGNATURE)
  'function consumeForMinting(bytes32 lockId, uint256 amount, bytes32 lusdTxHash, string publicationCode) returns (bytes32 mintingId, bytes32 thirdSignatureHash)',
  
  // View Functions
  'function getLockByAuthCode(string authCode) view returns (tuple(bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, uint256 originalAmount, uint256 availableAmount, uint256 consumedAmount, uint256 reserveAmount, address beneficiary, address dcbTreasury, address lemxOperator, uint8 status, bytes32 firstSignatureHash, bytes32 secondSignatureHash, bytes32 thirdSignatureHash, uint256 receivedAt, uint256 acceptedAt, uint256 lastConsumedAt, uint256 fullyConsumedAt))',
  'function getAllLockIds() view returns (bytes32[])',
  'function getLocksByStatus(uint8 status) view returns (bytes32[])',
  'function getStatistics() view returns (uint256 totalLocked, uint256 totalAvailableForMinting, uint256 totalConsumedForVUSD, uint256 totalLocks, uint256 totalMintingRecords)',
  'function verifySignatures(bytes32 lockId) view returns (bool hasFirstSignature, bool hasSecondSignature, bool hasThirdSignature, bytes32 firstSig, bytes32 secondSig, bytes32 thirdSig)',
  
  // Events
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, string authorizationCode, uint256 amount, address indexed beneficiary, uint256 timestamp)',
  'event LockAccepted(bytes32 indexed lockId, address indexed lemxOperator, bytes32 secondSignatureHash, uint256 timestamp)',
  'event LockConsumedForMinting(bytes32 indexed lockId, bytes32 indexed mintingId, uint256 amount, bytes32 lusdTxHash, bytes32 thirdSignatureHash, address indexed mintedBy, string publicationCode, uint256 timestamp)'
];

// VUSDMinting ABI (Third Signature & Mint Explorer)
export const VUSD_MINTING_ABI = [
  // Constants
  'function VERSION() view returns (string)',
  'function CONTRACT_NAME() view returns (string)',
  'function VUSD_CONTRACT() view returns (address)',
  'function EXPLORER_URL() view returns (string)',
  
  // State
  'function totalMinted() view returns (uint256)',
  'function totalMintOperations() view returns (uint256)',
  'function totalExplorerEntries() view returns (uint256)',
  
  // Minting Functions
  'function createMintRequest(bytes32 lockId, uint256 amount, string authorizationCode) returns (bytes32 requestId)',
  'function executeMint(bytes32 requestId, bytes32 providedTxHash, uint256 blockNumber, string bankName, string bankId, bytes32 usdInjectionId, uint256 usdInjectedAt, uint256 lockAcceptedAt, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32 entryId, string publicationCode)',
  'function mintAndPublish(bytes32 lockId, uint256 amount, address beneficiary, bytes32 txHash, string authorizationCode, string bankName, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32 entryId, string publicationCode)',
  
  // View Functions
  'function getEntryByPublicationCode(string pubCode) view returns (tuple(bytes32 entryId, bytes32 finalTxHash, uint256 blockNumber, uint256 blockTimestamp, string publicationCode, uint256 mintedAmount, address beneficiary, address mintedBy, bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, string bankName, string bankId, uint256 usdInjectedAt, uint256 lockAcceptedAt, uint256 mintedAt, uint8 status, address lusdContract))',
  'function getEntryByLockId(bytes32 lockId) view returns (tuple(bytes32 entryId, bytes32 finalTxHash, uint256 blockNumber, uint256 blockTimestamp, string publicationCode, uint256 mintedAmount, address beneficiary, address mintedBy, bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, string bankName, string bankId, uint256 usdInjectedAt, uint256 lockAcceptedAt, uint256 mintedAt, uint8 status, address lusdContract))',
  'function getAllExplorerEntryIds() view returns (bytes32[])',
  'function getRecentEntries(uint256 count) view returns (tuple(bytes32 entryId, bytes32 finalTxHash, uint256 blockNumber, uint256 blockTimestamp, string publicationCode, uint256 mintedAmount, address beneficiary, address mintedBy, bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, string bankName, string bankId, uint256 usdInjectedAt, uint256 lockAcceptedAt, uint256 mintedAt, uint8 status, address lusdContract)[])',
  'function verifyEntrySignatures(bytes32 entryId) view returns (bool hasAllSignatures, bytes32 firstSig, bytes32 secondSig, bytes32 thirdSig)',
  'function getStatistics() view returns (uint256 totalMinted, uint256 totalMintOperations, uint256 totalExplorerEntries, uint256 lusdTotalSupply)',
  
  // Events
  'event VUSDMinted(bytes32 indexed entryId, bytes32 indexed finalTxHash, string publicationCode, uint256 amount, address indexed beneficiary, uint256 timestamp)',
  'event PublishedToMintExplorer(bytes32 indexed entryId, string publicationCode, bytes32 finalTxHash, uint256 amount, address beneficiary, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, uint256 timestamp)'
];

// CustodyVault ABI
export const CUSTODY_VAULT_ABI = [
  // Constants
  'function VERSION() view returns (string)',
  'function NAME() view returns (string)',
  'function VUSD_CONTRACT() view returns (address)',
  
  // State
  'function totalVaults() view returns (uint256)',
  'function totalLocked() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  
  // Vault Functions
  'function createVault(address owner, uint256 amount, string sourceBankAccount, bytes32 metadataHash) returns (uint256 vaultId)',
  'function depositToVault(uint256 vaultId, uint256 amount)',
  
  // Lock Functions
  'function createLock(uint256 vaultId, uint256 amount, address beneficiary, bytes32 isoHash, bytes32 daesTxnId, uint256 expiry, bytes bankSignature) returns (bytes32 lockId)',
  'function consumeAndMint(bytes32 lockId) returns (bytes32 authCode)',
  'function completeMinting(bytes32 authCode, bytes32 mintTxHash)',
  
  // View Functions
  'function getVault(uint256 vaultId) view returns (tuple(uint256 id, address owner, uint256 totalBalance, uint256 availableBalance, uint256 lockedBalance, uint256 mintedBalance, uint8 status, bytes32 metadataHash, string sourceBankAccount, uint256 createdAt, uint256 updatedAt))',
  'function getLock(bytes32 lockId) view returns (tuple(bytes32 lockId, uint256 vaultId, uint256 amount, address beneficiary, address bankSigner, bytes32 isoHash, bytes32 daesTxnId, uint256 expiry, uint8 status, uint256 createdAt, uint256 consumedAt, bytes32 authorizationCode))',
  'function getMintAuthorization(bytes32 authCode) view returns (tuple(bytes32 authCode, bytes32 lockId, uint256 amount, address beneficiary, uint8 status, uint256 createdAt, uint256 deadline, bytes32 mintTxHash, address mintedBy, uint256 mintedAt))',
  'function isAuthorizationValid(bytes32 authCode) view returns (bool)',
  
  // Events
  'event VaultCreated(uint256 indexed vaultId, address indexed owner, uint256 amount, string sourceBankAccount, bytes32 metadataHash)',
  'event LockCreated(bytes32 indexed lockId, uint256 indexed vaultId, uint256 amount, address beneficiary, address bankSigner, bytes32 isoHash)',
  'event LockConsumed(bytes32 indexed lockId, bytes32 indexed authorizationCode, address operator, uint256 timestamp)',
  'event VUSDMinted(bytes32 indexed authCode, bytes32 indexed mintTxHash, uint256 amount, address beneficiary, address mintedBy)'
];

// MintingBridge ABI
export const MINTING_BRIDGE_ABI = [
  // Constants
  'function VERSION() view returns (string)',
  'function NAME() view returns (string)',
  'function VUSD_CONTRACT() view returns (address)',
  
  // State
  'function totalMinted() view returns (uint256)',
  'function totalRequests() view returns (uint256)',
  
  // Minting Functions
  'function submitMintRequest(bytes32 authCode) returns (bytes32 requestId)',
  'function approveMint(bytes32 requestId) returns (bytes32 mintTxHash)',
  'function rejectMint(bytes32 requestId, string reason)',
  'function mintWithAuthCode(bytes32 authCode) returns (bytes32 mintTxHash)',
  
  // View Functions
  'function getMintRequest(bytes32 requestId) view returns (tuple(bytes32 id, bytes32 authCode, uint256 amount, address beneficiary, uint8 status, uint256 createdAt, uint256 processedAt, bytes32 mintTxHash, address processedBy, string notes))',
  'function getPendingRequests() view returns (bytes32[])',
  'function isAuthCodeProcessed(bytes32 authCode) view returns (bool)',
  
  // Events
  'event MintRequestCreated(bytes32 indexed requestId, bytes32 indexed authCode, uint256 amount, address beneficiary, address operator)',
  'event VUSDMinted(bytes32 indexed requestId, bytes32 indexed authCode, uint256 amount, address indexed beneficiary, bytes32 mintTxHash, address operator)'
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface LockData {
  id: bigint;
  depositor: string;
  beneficiary: string;
  amount: bigint;
  originalAmount: bigint;
  lockTime: bigint;
  unlockTime: bigint;
  status: number;
  lockType: number;
  refId: string;
  txHash: string;
}

export interface LocksTreasuryData {
  lockId: string;
  usdInjectionId: string;
  authorizationCode: string;
  originalAmount: bigint;
  availableAmount: bigint;
  consumedAmount: bigint;
  reserveAmount: bigint;
  beneficiary: string;
  dcbTreasury: string;
  lemxOperator: string;
  status: number;
  firstSignatureHash: string;
  secondSignatureHash: string;
  thirdSignatureHash: string;
  receivedAt: bigint;
  acceptedAt: bigint;
}

export interface MintExplorerEntry {
  entryId: string;
  finalTxHash: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  publicationCode: string;
  mintedAmount: bigint;
  beneficiary: string;
  mintedBy: string;
  lockId: string;
  usdInjectionId: string;
  authorizationCode: string;
  firstSignature: string;
  secondSignature: string;
  thirdSignature: string;
  bankName: string;
  bankId: string;
  usdInjectedAt: bigint;
  lockAcceptedAt: bigint;
  mintedAt: bigint;
  status: number;
  lusdContract: string;
}

export interface VaultData {
  id: bigint;
  owner: string;
  totalBalance: bigint;
  availableBalance: bigint;
  lockedBalance: bigint;
  mintedBalance: bigint;
  status: number;
  metadataHash: string;
  sourceBankAccount: string;
  createdAt: bigint;
  updatedAt: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer | null = null;
  
  // Contract instances
  private lusdContract: ethers.Contract | null = null;
  private lockBoxContract: ethers.Contract | null = null;
  private locksTreasuryContract: ethers.Contract | null = null;
  private lusdMintingContract: ethers.Contract | null = null;
  private custodyVaultContract: ethers.Contract | null = null;
  private mintingBridgeContract: ethers.Contract | null = null;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(LEMONCHAIN_CONFIG.rpcUrl);
    this.initializeContracts();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  private initializeContracts(): void {
    // Initialize read-only contracts
    if (CONTRACT_ADDRESSES.VUSD !== '0x0000000000000000000000000000000000000000') {
      this.lusdContract = new ethers.Contract(CONTRACT_ADDRESSES.VUSD, VUSD_ABI, this.provider);
    }
    
    if (CONTRACT_ADDRESSES.LockBox !== '0x0000000000000000000000000000000000000000') {
      this.lockBoxContract = new ethers.Contract(CONTRACT_ADDRESSES.LockBox, LOCKBOX_ABI, this.provider);
    }
    
    if (CONTRACT_ADDRESSES.LocksTreasuryVUSD !== '0x0000000000000000000000000000000000000000') {
      this.locksTreasuryContract = new ethers.Contract(CONTRACT_ADDRESSES.LocksTreasuryVUSD, LOCKS_TREASURY_ABI, this.provider);
    }
    
    if (CONTRACT_ADDRESSES.VUSDMinting !== '0x0000000000000000000000000000000000000000') {
      this.lusdMintingContract = new ethers.Contract(CONTRACT_ADDRESSES.VUSDMinting, VUSD_MINTING_ABI, this.provider);
    }
    
    if (CONTRACT_ADDRESSES.CustodyVault !== '0x0000000000000000000000000000000000000000') {
      this.custodyVaultContract = new ethers.Contract(CONTRACT_ADDRESSES.CustodyVault, CUSTODY_VAULT_ABI, this.provider);
    }
    
    if (CONTRACT_ADDRESSES.MintingBridge !== '0x0000000000000000000000000000000000000000') {
      this.mintingBridgeContract = new ethers.Contract(CONTRACT_ADDRESSES.MintingBridge, MINTING_BRIDGE_ABI, this.provider);
    }
  }
  
  async connectWallet(): Promise<string> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }
    
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Switch to LemonChain if not already on it
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: LEMONCHAIN_CONFIG.chainIdHex }]
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: LEMONCHAIN_CONFIG.chainIdHex,
            chainName: LEMONCHAIN_CONFIG.name,
            nativeCurrency: LEMONCHAIN_CONFIG.nativeCurrency,
            rpcUrls: [LEMONCHAIN_CONFIG.rpcUrl],
            blockExplorerUrls: [LEMONCHAIN_CONFIG.explorerUrl]
          }]
        });
      } else {
        throw switchError;
      }
    }
    
    this.signer = await browserProvider.getSigner();
    const address = await this.signer.getAddress();
    
    // Re-initialize contracts with signer for write operations
    this.initializeContractsWithSigner();
    
    return address;
  }
  
  private initializeContractsWithSigner(): void {
    if (!this.signer) return;
    
    if (this.lusdContract) {
      this.lusdContract = this.lusdContract.connect(this.signer);
    }
    if (this.lockBoxContract) {
      this.lockBoxContract = this.lockBoxContract.connect(this.signer);
    }
    if (this.locksTreasuryContract) {
      this.locksTreasuryContract = this.locksTreasuryContract.connect(this.signer);
    }
    if (this.lusdMintingContract) {
      this.lusdMintingContract = this.lusdMintingContract.connect(this.signer);
    }
    if (this.custodyVaultContract) {
      this.custodyVaultContract = this.custodyVaultContract.connect(this.signer);
    }
    if (this.mintingBridgeContract) {
      this.mintingBridgeContract = this.mintingBridgeContract.connect(this.signer);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // NETWORK INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }
  
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || 0n;
  }
  
  async getBlock(blockNumber: number): Promise<ethers.Block | null> {
    return await this.provider.getBlock(blockNumber);
  }
  
  async getTransactionCount(): Promise<number> {
    // Estimate based on block number and average tx per block
    const blockNumber = await this.getBlockNumber();
    return blockNumber * 8; // Estimated average
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // VUSD CONTRACT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async getVUSDTotalSupply(): Promise<bigint> {
    if (!this.lusdContract) throw new Error('VUSD contract not initialized');
    return await this.lusdContract.totalSupply();
  }
  
  async getVUSDBalance(address: string): Promise<bigint> {
    if (!this.lusdContract) throw new Error('VUSD contract not initialized');
    return await this.lusdContract.balanceOf(address);
  }
  
  async approveVUSD(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.lusdContract) throw new Error('VUSD contract not initialized');
    return await this.lusdContract.approve(spender, amount);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // LOCKBOX CONTRACT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async lockVUSD(
    beneficiary: string,
    amount: bigint,
    duration: bigint,
    refId: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.lockBoxContract) throw new Error('LockBox contract not initialized');
    return await this.lockBoxContract.lockVUSD(beneficiary, amount, duration, refId);
  }
  
  async releaseVUSD(lockId: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.lockBoxContract) throw new Error('LockBox contract not initialized');
    return await this.lockBoxContract.releaseVUSD(lockId);
  }
  
  async getLock(lockId: bigint): Promise<LockData> {
    if (!this.lockBoxContract) throw new Error('LockBox contract not initialized');
    return await this.lockBoxContract.getLock(lockId);
  }
  
  async getLockBoxStatistics(): Promise<{
    lockCount: bigint;
    totalLocked: bigint;
    totalReleased: bigint;
    totalEmergencyWithdrawals: bigint;
    totalPenaltiesCollected: bigint;
  }> {
    if (!this.lockBoxContract) throw new Error('LockBox contract not initialized');
    const [lockCount, totalLocked, totalReleased, totalEmergencyWithdrawals, totalPenaltiesCollected] = 
      await this.lockBoxContract.getStatistics();
    return { lockCount, totalLocked, totalReleased, totalEmergencyWithdrawals, totalPenaltiesCollected };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // LOCKS TREASURY VUSD FUNCTIONS (Second Signature)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async receiveLock(
    usdInjectionId: string,
    authorizationCode: string,
    amount: bigint,
    beneficiary: string,
    firstSignatureHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.locksTreasuryContract) throw new Error('LocksTreasuryVUSD contract not initialized');
    return await this.locksTreasuryContract.receiveLock(
      usdInjectionId, authorizationCode, amount, beneficiary, firstSignatureHash
    );
  }
  
  async acceptLock(lockId: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.locksTreasuryContract) throw new Error('LocksTreasuryVUSD contract not initialized');
    return await this.locksTreasuryContract.acceptLock(lockId);
  }
  
  async consumeForMinting(
    lockId: string,
    amount: bigint,
    lusdTxHash: string,
    publicationCode: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.locksTreasuryContract) throw new Error('LocksTreasuryVUSD contract not initialized');
    return await this.locksTreasuryContract.consumeForMinting(lockId, amount, lusdTxHash, publicationCode);
  }
  
  async getLockByAuthCode(authCode: string): Promise<LocksTreasuryData> {
    if (!this.locksTreasuryContract) throw new Error('LocksTreasuryVUSD contract not initialized');
    return await this.locksTreasuryContract.getLockByAuthCode(authCode);
  }
  
  async verifySignatures(lockId: string): Promise<{
    hasFirstSignature: boolean;
    hasSecondSignature: boolean;
    hasThirdSignature: boolean;
    firstSig: string;
    secondSig: string;
    thirdSig: string;
  }> {
    if (!this.locksTreasuryContract) throw new Error('LocksTreasuryVUSD contract not initialized');
    const [hasFirst, hasSecond, hasThird, firstSig, secondSig, thirdSig] = 
      await this.locksTreasuryContract.verifySignatures(lockId);
    return { 
      hasFirstSignature: hasFirst, 
      hasSecondSignature: hasSecond, 
      hasThirdSignature: hasThird,
      firstSig, secondSig, thirdSig 
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // VUSD MINTING FUNCTIONS (Third Signature & Mint Explorer)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async mintAndPublish(
    lockId: string,
    amount: bigint,
    beneficiary: string,
    txHash: string,
    authorizationCode: string,
    bankName: string,
    firstSignature: string,
    secondSignature: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.lusdMintingContract) throw new Error('VUSDMinting contract not initialized');
    return await this.lusdMintingContract.mintAndPublish(
      lockId, amount, beneficiary, txHash, authorizationCode, bankName, firstSignature, secondSignature
    );
  }
  
  async getMintExplorerEntry(publicationCode: string): Promise<MintExplorerEntry> {
    if (!this.lusdMintingContract) throw new Error('VUSDMinting contract not initialized');
    return await this.lusdMintingContract.getEntryByPublicationCode(publicationCode);
  }
  
  async getRecentMintExplorerEntries(count: number): Promise<MintExplorerEntry[]> {
    if (!this.lusdMintingContract) throw new Error('VUSDMinting contract not initialized');
    return await this.lusdMintingContract.getRecentEntries(count);
  }
  
  async getMintingStatistics(): Promise<{
    totalMinted: bigint;
    totalMintOperations: bigint;
    totalExplorerEntries: bigint;
    lusdTotalSupply: bigint;
  }> {
    if (!this.lusdMintingContract) throw new Error('VUSDMinting contract not initialized');
    const [totalMinted, totalMintOperations, totalExplorerEntries, lusdTotalSupply] = 
      await this.lusdMintingContract.getStatistics();
    return { totalMinted, totalMintOperations, totalExplorerEntries, lusdTotalSupply };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // CUSTODY VAULT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async createVault(
    owner: string,
    amount: bigint,
    sourceBankAccount: string,
    metadataHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.custodyVaultContract) throw new Error('CustodyVault contract not initialized');
    return await this.custodyVaultContract.createVault(owner, amount, sourceBankAccount, metadataHash);
  }
  
  async createCustodyLock(
    vaultId: bigint,
    amount: bigint,
    beneficiary: string,
    isoHash: string,
    daesTxnId: string,
    expiry: bigint,
    bankSignature: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.custodyVaultContract) throw new Error('CustodyVault contract not initialized');
    return await this.custodyVaultContract.createLock(
      vaultId, amount, beneficiary, isoHash, daesTxnId, expiry, bankSignature
    );
  }
  
  async consumeAndMint(lockId: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.custodyVaultContract) throw new Error('CustodyVault contract not initialized');
    return await this.custodyVaultContract.consumeAndMint(lockId);
  }
  
  async getVault(vaultId: bigint): Promise<VaultData> {
    if (!this.custodyVaultContract) throw new Error('CustodyVault contract not initialized');
    return await this.custodyVaultContract.getVault(vaultId);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // MINTING BRIDGE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  async submitMintRequest(authCode: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.mintingBridgeContract) throw new Error('MintingBridge contract not initialized');
    return await this.mintingBridgeContract.submitMintRequest(authCode);
  }
  
  async approveMint(requestId: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.mintingBridgeContract) throw new Error('MintingBridge contract not initialized');
    return await this.mintingBridgeContract.approveMint(requestId);
  }
  
  async mintWithAuthCode(authCode: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.mintingBridgeContract) throw new Error('MintingBridge contract not initialized');
    return await this.mintingBridgeContract.mintWithAuthCode(authCode);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  formatAmount(amount: bigint, decimals: number = 6): string {
    return ethers.formatUnits(amount, decimals);
  }
  
  parseAmount(amount: string, decimals: number = 6): bigint {
    return ethers.parseUnits(amount, decimals);
  }
  
  generateSignatureHash(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }
  
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
  
  getExplorerUrl(txHash: string): string {
    return `${LEMONCHAIN_CONFIG.explorerUrl}/tx/${txHash}`;
  }
  
  getAddressExplorerUrl(address: string): string {
    return `${LEMONCHAIN_CONFIG.explorerUrl}/address/${address}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export const blockchainService = new BlockchainService();
export default blockchainService;
