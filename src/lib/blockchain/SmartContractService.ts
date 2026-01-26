/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║  🔗 SMART CONTRACT SERVICE - DCB Treasury & Treasury Minting Integration                                                     ║
 * ║                                                                                                                              ║
 * ║  Network: LemonChain Mainnet (Chain ID: 8866)                                                                                ║
 * ║  Version: 4.0.0                                                                                                              ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';

// ══════════════════════════════════════════════════════════════════════════════
// LEMONCHAIN CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const LEMONCHAIN_CONFIG = {
  chainId: 1006,
  chainIdHex: '0x3EE',
  name: 'LemonChain Mainnet',
  rpcUrl: 'https://rpc.lemonchain.io',
  explorerUrl: 'https://explorer.lemonchain.io',
  nativeCurrency: {
    name: 'Lemon',
    symbol: 'LEMON',
    decimals: 18
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES (Update after deployment)
// ══════════════════════════════════════════════════════════════════════════════

export const CONTRACT_ADDRESSES = {
  // Official VUSD (already deployed)
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // DCB Treasury v5 Contracts - DEPLOYED & VERIFIED ON LEMONCHAIN (Chain ID: 1006) - Jan 2026
  // https://explorer.lemonchain.io
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',           // USDTokenized (First Signature)
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',   // LockReserve (Second Signature)
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',    // VUSDMinter (Third Signature)
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531' // Cross-chain bridge
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT ABIs (Simplified for frontend)
// ══════════════════════════════════════════════════════════════════════════════

export const USD_ABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalInjected() view returns (uint256)',
  'function totalInLockReserve() view returns (uint256)',
  'function totalConsumedForVUSD() view returns (uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function getInjection(bytes32 injectionId) view returns (tuple)',
  
  // Write functions
  'function injectFromDAES(uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash) returns (bytes32)',
  'function acceptInjection(bytes32 injectionId) returns (bool)',
  'function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) returns (bool)',
  
  // Events
  'event USDInjected(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary, uint8 msgType, string messageId, bytes32 xmlHash, bytes32 dcbSignature, uint256 timestamp)',
  'event InjectionAccepted(bytes32 indexed injectionId, address indexed acceptedBy, uint256 timestamp)',
  'event MovedToLockReserve(bytes32 indexed injectionId, bytes32 indexed lockReserveId, uint256 amount, uint256 timestamp)'
];

export const LOCK_RESERVE_ABI = [
  // Read functions
  'function totalReserve() view returns (uint256)',
  'function totalConsumed() view returns (uint256)',
  'function totalLocks() view returns (uint256)',
  'function getLock(bytes32 lockId) view returns (tuple)',
  'function getAvailableReserve(bytes32 lockId) view returns (uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function verifySignatures(bytes32 lockId) view returns (bool, bool, bool, bytes32, bytes32, bytes32)',
  
  // Write functions
  'function receiveLock(bytes32 usdInjectionId, uint256 amount, address beneficiary, bytes32 firstSignature) returns (bytes32)',
  'function acceptLock(bytes32 lockId) returns (bytes32, string)',
  'function moveToReserve(bytes32 lockId)',
  'function consumeForVUSD(bytes32 lockId, uint256 amount, bytes32 lusdTxHash) returns (bytes32, bytes32)',
  
  // Events
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, uint256 amount, address indexed beneficiary, bytes32 firstSignature, uint256 timestamp)',
  'event LockAccepted(bytes32 indexed lockId, address indexed acceptedBy, bytes32 secondSignature, string authorizationCode, uint256 timestamp)',
  'event MovedToReserve(bytes32 indexed lockId, uint256 amount, uint256 timestamp)',
  'event ReserveConsumed(bytes32 indexed lockId, bytes32 indexed consumptionId, uint256 amount, bytes32 lusdMintingId, bytes32 thirdSignature, uint256 timestamp)'
];

export const VUSD_MINTER_ABI = [
  // Read functions
  'function totalBacked() view returns (uint256)',
  'function totalCertificates() view returns (uint256)',
  'function getCertificate(bytes32 certificateId) view returns (tuple)',
  'function verifyBackedSignature(bytes32 backedSignature) view returns (bool, bytes32, uint256, uint256)',
  'function verifyAllSignatures(bytes32 certificateId) view returns (bool, bytes32, bytes32, bytes32, bool)',
  'function getBackingProof(bytes32 emisorTxHash) view returns (bool, bytes32, uint256, uint256, address, uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  
  // Write functions
  'function generateBackedSignature(bytes32 lockReserveId, uint256 amount, address beneficiary, bytes32 emisorTxHash, string authorizationCode, string bankName, string bankBIC, bytes32 firstSignature, bytes32 secondSignature, uint256 usdTokenizedAt, uint256 lockAcceptedAt) returns (bytes32, bytes32, string)',
  'function backAndMint(bytes32 lockReserveId, uint256 amount, address beneficiary, bytes32 emisorTxHash, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32, bytes32, string)',
  
  // Events
  'event BackedSignatureGenerated(bytes32 indexed certificateId, bytes32 indexed backedSignature, bytes32 emisorTxHash, address indexed emisor, uint256 usdAmount, uint256 lusdMinted, uint256 timestamp)',
  'event CertificatePublished(bytes32 indexed certificateId, string publicationCode, bytes32 backedSignature, uint256 usdBacking, uint256 lusdMinted, uint256 backingRatio, address beneficiary, uint256 timestamp)',
  'event BackingVerified(bytes32 indexed certificateId, bytes32 backedSignature, uint256 usdBacking, uint256 lusdMinted, int256 usdPrice, int256 lusdPrice, uint256 backingRatio, uint256 timestamp)'
];

export const PRICE_ORACLE_ABI = [
  'function getPrice(string symbol) view returns (int256)',
  'function getUSDPrice() view returns (int256)',
  'function getVUSDPrice() view returns (int256)',
  'function getUSDTPrice() view returns (int256)',
  'function getUSDCPrice() view returns (int256)',
  'function getAllStablecoinPrices() view returns (int256, int256, int256, int256, uint256)',
  'function decimals() view returns (uint8)'
];

export const VUSD_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)'
];

export const MULTICHAIN_BRIDGE_ABI = [
  // Read functions
  'function totalLocked() view returns (uint256)',
  'function totalReleased() view returns (uint256)',
  'function supportedChains(uint256 chainId) view returns (bool)',
  'function getBridgeTransaction(bytes32 txId) view returns (tuple)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256)',
  
  // Write functions
  'function lockForBridge(uint256 amount, uint256 targetChainId, address targetAddress) returns (bytes32)',
  'function releaseFromBridge(bytes32 bridgeTxId, uint256 amount, address recipient, bytes[] signatures) returns (bool)',
  'function addSupportedChain(uint256 chainId, string chainName)',
  'function removeSupportedChain(uint256 chainId)',
  
  // Events
  'event TokensLocked(bytes32 indexed txId, address indexed sender, uint256 amount, uint256 targetChainId, address targetAddress, uint256 timestamp)',
  'event TokensReleased(bytes32 indexed txId, address indexed recipient, uint256 amount, uint256 sourceChainId, uint256 timestamp)',
  'event ChainAdded(uint256 indexed chainId, string chainName)',
  'event ChainRemoved(uint256 indexed chainId)'
];

// ══════════════════════════════════════════════════════════════════════════════
// SMART CONTRACT SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class SmartContractService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private connectedAddress: string | null = null;
  private contracts: {
    usd: ethers.Contract | null;
    lockReserve: ethers.Contract | null;
    vusdMinter: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
    vusd: ethers.Contract | null;
    multichainBridge: ethers.Contract | null;
  } = {
    usd: null,
    lockReserve: null,
    vusdMinter: null,
    priceOracle: null,
    vusd: null,
    multichainBridge: null
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // CONNECTION STATUS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.signer !== null && this.connectedAddress !== null;
  }

  /**
   * Alias for isConnected (for backwards compatibility)
   */
  getIsConnected(): boolean {
    return this.isConnected();
  }

  /**
   * Get connected wallet address
   */
  getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  /**
   * Get provider instance
   */
  getProvider(): ethers.BrowserProvider | ethers.JsonRpcProvider | null {
    return this.provider;
  }

  /**
   * Get signer instance
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════════════════════════════

  async connectWallet(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    
    // Request accounts
    const accounts = await this.provider.send('eth_requestAccounts', []);
    
    // Check network
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== LEMONCHAIN_CONFIG.chainId) {
      await this.switchToLemonChain();
    }
    
    this.signer = await this.provider.getSigner();
    this.connectedAddress = accounts[0];
    
    // Initialize contracts
    this.initializeContracts();
    
    console.log(`[SmartContractService] Connected to wallet: ${this.connectedAddress}`);
    
    return accounts[0];
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.connectedAddress = null;
    this.contracts = {
      usd: null,
      lockReserve: null,
      vusdMinter: null,
      priceOracle: null,
      vusd: null,
      multichainBridge: null
    };
    console.log('[SmartContractService] Disconnected from wallet');
  }

  /**
   * Connect with private key (for production mode without MetaMask)
   */
  async connectWithPrivateKey(privateKey: string): Promise<{ address: string; chainId: number }> {
    try {
      console.log('[SmartContractService] Connecting with private key to LemonChain...');
      
      // Create JSON RPC Provider for LemonChain
      this.provider = new ethers.JsonRpcProvider(LEMONCHAIN_CONFIG.rpcUrl);
      
      // Verify network
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      console.log(`[SmartContractService] Connected to chain ID: ${chainId}`);
      
      if (chainId !== LEMONCHAIN_CONFIG.chainId) {
        throw new Error(`Wrong network. Expected LemonChain (${LEMONCHAIN_CONFIG.chainId}), got ${chainId}`);
      }
      
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey, this.provider);
      this.signer = wallet;
      this.connectedAddress = wallet.address;
      
      // Initialize contracts with the signer
      this.initializeContracts();
      
      console.log(`[SmartContractService] ✅ Connected to LemonChain with address: ${this.connectedAddress}`);
      
      return {
        address: wallet.address,
        chainId: chainId
      };
    } catch (error: any) {
      console.error('[SmartContractService] Connection with private key failed:', error);
      throw new Error(`Failed to connect with private key: ${error.message}`);
    }
  }

  /**
   * Get wallet balance (LEMON)
   */
  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async switchToLemonChain(): Promise<void> {
    if (!window.ethereum) throw new Error('MetaMask not detected');
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: LEMONCHAIN_CONFIG.chainIdHex }]
      });
    } catch (switchError: any) {
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
  }

  private initializeContracts(): void {
    if (!this.signer) return;

    if (CONTRACT_ADDRESSES.USD) {
      this.contracts.usd = new ethers.Contract(CONTRACT_ADDRESSES.USD, USD_ABI, this.signer);
    }
    if (CONTRACT_ADDRESSES.LockReserve) {
      this.contracts.lockReserve = new ethers.Contract(CONTRACT_ADDRESSES.LockReserve, LOCK_RESERVE_ABI, this.signer);
    }
    if (CONTRACT_ADDRESSES.VUSDMinter) {
      this.contracts.vusdMinter = new ethers.Contract(CONTRACT_ADDRESSES.VUSDMinter, VUSD_MINTER_ABI, this.signer);
    }
    if (CONTRACT_ADDRESSES.PriceOracle) {
      this.contracts.priceOracle = new ethers.Contract(CONTRACT_ADDRESSES.PriceOracle, PRICE_ORACLE_ABI, this.signer);
    }
    if (CONTRACT_ADDRESSES.MultichainBridge) {
      this.contracts.multichainBridge = new ethers.Contract(CONTRACT_ADDRESSES.MultichainBridge, MULTICHAIN_BRIDGE_ABI, this.signer);
    }
    this.contracts.vusd = new ethers.Contract(CONTRACT_ADDRESSES.VUSD, VUSD_ABI, this.signer);
    
    console.log('[SmartContractService] Contracts initialized:', {
      USD: CONTRACT_ADDRESSES.USD,
      LockReserve: CONTRACT_ADDRESSES.LockReserve,
      VUSDMinter: CONTRACT_ADDRESSES.VUSDMinter,
      PriceOracle: CONTRACT_ADDRESSES.PriceOracle,
      MultichainBridge: CONTRACT_ADDRESSES.MultichainBridge,
      VUSD: CONTRACT_ADDRESSES.VUSD
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // USD CONTRACT FUNCTIONS (DCB Treasury)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Injects USD from DAES system (DCB Treasury)
   * @returns injectionId and firstSignature
   */
  async injectUSD(
    amount: bigint,
    beneficiary: string,
    daesTransactionId: string,
    xmlHash: string
  ): Promise<{ injectionId: string; txHash: string }> {
    if (!this.contracts.usd) throw new Error('USD contract not initialized');

    const tx = await this.contracts.usd.injectFromDAES(
      amount,
      beneficiary,
      daesTransactionId,
      xmlHash
    );
    
    const receipt = await tx.wait();
    
    // Get injectionId from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.usd!.interface.parseLog(log);
        return parsed?.name === 'USDInjected';
      } catch { return false; }
    });
    
    const parsed = this.contracts.usd.interface.parseLog(event);
    
    return {
      injectionId: parsed?.args?.injectionId || '',
      txHash: receipt.hash
    };
  }

  async getUSDStatistics(): Promise<{
    totalSupply: bigint;
    totalInjected: bigint;
    totalInLockReserve: bigint;
    totalConsumedForVUSD: bigint;
    totalInjections: bigint;
  }> {
    if (!this.contracts.usd) throw new Error('USD contract not initialized');
    
    const stats = await this.contracts.usd.getStatistics();
    return {
      totalSupply: stats[0],
      totalInjected: stats[1],
      totalInLockReserve: stats[2],
      totalConsumedForVUSD: stats[3],
      totalInjections: stats[4]
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LOCK RESERVE FUNCTIONS (Treasury Minting)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Receives a lock from USD contract (Treasury Minting)
   */
  async receiveLock(
    usdInjectionId: string,
    amount: bigint,
    beneficiary: string,
    firstSignature: string
  ): Promise<{ lockId: string; txHash: string }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    const tx = await this.contracts.lockReserve.receiveLock(
      usdInjectionId,
      amount,
      beneficiary,
      firstSignature
    );
    
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.lockReserve!.interface.parseLog(log);
        return parsed?.name === 'LockReceived';
      } catch { return false; }
    });
    
    const parsed = this.contracts.lockReserve.interface.parseLog(event);
    
    return {
      lockId: parsed?.args?.lockId || '',
      txHash: receipt.hash
    };
  }

  /**
   * Accepts a lock - generates SECOND SIGNATURE
   */
  async acceptLock(lockId: string): Promise<{
    secondSignature: string;
    authorizationCode: string;
    txHash: string;
  }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    const tx = await this.contracts.lockReserve.acceptLock(lockId);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.lockReserve!.interface.parseLog(log);
        return parsed?.name === 'LockAccepted';
      } catch { return false; }
    });
    
    const parsed = this.contracts.lockReserve.interface.parseLog(event);
    
    return {
      secondSignature: parsed?.args?.secondSignature || '',
      authorizationCode: parsed?.args?.authorizationCode || '',
      txHash: receipt.hash
    };
  }

  /**
   * Moves accepted lock to reserve
   */
  async moveToReserve(lockId: string): Promise<string> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    const tx = await this.contracts.lockReserve.moveToReserve(lockId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getLockReserveStatistics(): Promise<{
    totalReserve: bigint;
    totalConsumed: bigint;
    totalLocks: bigint;
    totalConsumptions: bigint;
    reserveRatio: bigint;
  }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');
    
    const stats = await this.contracts.lockReserve.getStatistics();
    return {
      totalReserve: stats[0],
      totalConsumed: stats[1],
      totalLocks: stats[2],
      totalConsumptions: stats[3],
      reserveRatio: stats[4]
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VUSD MINTER FUNCTIONS (Backed Certificate / Third Signature)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Generates BACKED SIGNATURE (Third Signature) - Emisor provides TX hash
   */
  async generateBackedSignature(
    lockReserveId: string,
    amount: bigint,
    beneficiary: string,
    emisorTxHash: string,
    authorizationCode: string,
    firstSignature: string,
    secondSignature: string
  ): Promise<{
    certificateId: string;
    backedSignature: string;
    publicationCode: string;
    txHash: string;
  }> {
    if (!this.contracts.vusdMinter) throw new Error('VUSDMinter contract not initialized');

    const tx = await this.contracts.vusdMinter.backAndMint(
      lockReserveId,
      amount,
      beneficiary,
      emisorTxHash,
      authorizationCode,
      firstSignature,
      secondSignature
    );
    
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.vusdMinter!.interface.parseLog(log);
        return parsed?.name === 'BackedSignatureGenerated';
      } catch { return false; }
    });
    
    const parsed = this.contracts.vusdMinter.interface.parseLog(event);
    
    return {
      certificateId: parsed?.args?.certificateId || '',
      backedSignature: parsed?.args?.backedSignature || '',
      publicationCode: '', // Get from CertificatePublished event
      txHash: receipt.hash
    };
  }

  /**
   * Verifies a backed signature
   */
  async verifyBackedSignature(backedSignature: string): Promise<{
    isValid: boolean;
    certificateId: string;
    usdBacking: bigint;
    vusdMinted: bigint;
  }> {
    if (!this.contracts.vusdMinter) throw new Error('VUSDMinter contract not initialized');

    const result = await this.contracts.vusdMinter.verifyBackedSignature(backedSignature);
    return {
      isValid: result[0],
      certificateId: result[1],
      usdBacking: result[2],
      vusdMinted: result[3]
    };
  }

  /**
   * Gets backing proof for an emisor TX hash
   */
  async getBackingProof(emisorTxHash: string): Promise<{
    isBacked: boolean;
    backedSignature: string;
    usdBacking: bigint;
    vusdMinted: bigint;
    emisor: string;
    backedAt: bigint;
  }> {
    if (!this.contracts.vusdMinter) throw new Error('VUSDMinter contract not initialized');

    const result = await this.contracts.vusdMinter.getBackingProof(emisorTxHash);
    return {
      isBacked: result[0],
      backedSignature: result[1],
      usdBacking: result[2],
      vusdMinted: result[3],
      emisor: result[4],
      backedAt: result[5]
    };
  }

  async getVUSDMinterStatistics(): Promise<{
    totalBacked: bigint;
    totalBackingOperations: bigint;
    totalCertificates: bigint;
    vusdTotalSupply: bigint;
    globalBackingRatio: bigint;
  }> {
    if (!this.contracts.vusdMinter) throw new Error('VUSDMinter contract not initialized');
    
    const stats = await this.contracts.vusdMinter.getStatistics();
    return {
      totalBacked: stats[0],
      totalBackingOperations: stats[1],
      totalCertificates: stats[2],
      vusdTotalSupply: stats[3],
      globalBackingRatio: stats[4]
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRICE ORACLE FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  async getStablecoinPrices(): Promise<{
    usdPrice: bigint;
    lusdPrice: bigint;
    usdtPrice: bigint;
    usdcPrice: bigint;
    lastUpdated: bigint;
  }> {
    if (!this.contracts.priceOracle) {
      // Return default $1.00 prices if oracle not available
      const oneUsd = BigInt(100000000); // 1e8
      return {
        usdPrice: oneUsd,
        lusdPrice: oneUsd,
        usdtPrice: oneUsd,
        usdcPrice: oneUsd,
        lastUpdated: BigInt(Date.now())
      };
    }

    const prices = await this.contracts.priceOracle.getAllStablecoinPrices();
    return {
      usdPrice: prices[0],
      lusdPrice: prices[1],
      usdtPrice: prices[2],
      usdcPrice: prices[3],
      lastUpdated: prices[4]
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VUSD TOKEN FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  async getVUSDBalance(address: string): Promise<bigint> {
    if (!this.contracts.vusd) throw new Error('VUSD contract not initialized');
    return await this.contracts.vusd.balanceOf(address);
  }

  async getVUSDTotalSupply(): Promise<bigint> {
    if (!this.contracts.vusd) throw new Error('VUSD contract not initialized');
    return await this.contracts.vusd.totalSupply();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MULTICHAIN BRIDGE FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Lock VUSD for cross-chain transfer
   */
  async lockForBridge(
    amount: bigint,
    targetChainId: number,
    targetAddress: string
  ): Promise<{ bridgeTxId: string; txHash: string }> {
    if (!this.contracts.multichainBridge) throw new Error('MultichainBridge contract not initialized');

    const tx = await this.contracts.multichainBridge.lockForBridge(amount, targetChainId, targetAddress);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.multichainBridge!.interface.parseLog(log);
        return parsed?.name === 'TokensLocked';
      } catch { return false; }
    });
    
    const parsed = this.contracts.multichainBridge.interface.parseLog(event);
    
    return {
      bridgeTxId: parsed?.args?.txId || '',
      txHash: receipt.hash
    };
  }

  /**
   * Get bridge statistics
   */
  async getBridgeStatistics(): Promise<{
    totalLocked: bigint;
    totalReleased: bigint;
    pendingTransfers: bigint;
    completedTransfers: bigint;
  }> {
    if (!this.contracts.multichainBridge) throw new Error('MultichainBridge contract not initialized');
    
    const stats = await this.contracts.multichainBridge.getStatistics();
    return {
      totalLocked: stats[0],
      totalReleased: stats[1],
      pendingTransfers: stats[2],
      completedTransfers: stats[3]
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  formatAmount(amount: bigint, decimals: number = 6): string {
    const divisor = BigInt(10 ** decimals);
    const intPart = amount / divisor;
    const decPart = amount % divisor;
    return `${intPart}.${decPart.toString().padStart(decimals, '0')}`;
  }

  parseAmount(amount: string, decimals: number = 6): bigint {
    const [intPart, decPart = ''] = amount.split('.');
    const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(intPart + paddedDec);
  }

  generateXmlHash(xmlContent: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(xmlContent));
  }

  generateDaesTransactionId(): string {
    return `DAES-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DIRECT VUSD MINTING (Using Minter Wallet from .env)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Mint VUSD directly to a beneficiary using the minter wallet
   * This is the REAL blockchain interaction - not simulation
   * Uses VITE_VUSD_MINTER_PRIVATE_KEY from .env
   */
  async mintVUSDDirect(
    beneficiary: string,
    amount: number,
    authorizationCode?: string
  ): Promise<{
    success: boolean;
    txHash: string;
    blockNumber: number;
    mintedAmount: string;
    beneficiary: string;
    error?: string;
  }> {
    console.log('%c🔗 MINT VUSD DIRECT: Iniciando mint real en blockchain...', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('   Beneficiary:', beneficiary);
    console.log('   Amount:', amount, 'VUSD');
    
    try {
      // Get minter private key from env
      const minterPrivateKey = import.meta.env.VITE_VUSD_MINTER_PRIVATE_KEY;
      const vusdContract = import.meta.env.VITE_VUSD_CONTRACT || CONTRACT_ADDRESSES.VUSD;
      
      if (!minterPrivateKey) {
        throw new Error('VITE_VUSD_MINTER_PRIVATE_KEY not configured in .env');
      }
      
      console.log('   VUSD Contract:', vusdContract);
      console.log('   Using Minter Wallet from .env');
      
      // Create provider WITHOUT ENS support (LemonChain doesn't support ENS)
      const provider = new ethers.JsonRpcProvider(LEMONCHAIN_CONFIG.rpcUrl, {
        chainId: LEMONCHAIN_CONFIG.chainId,
        name: 'LemonChain',
        ensAddress: undefined // Disable ENS
      });
      
      const minterWallet = new ethers.Wallet(minterPrivateKey, provider);
      
      console.log('   Minter Address:', minterWallet.address);
      
      // Validate beneficiary address format
      if (!ethers.isAddress(beneficiary)) {
        throw new Error(`Invalid beneficiary address: ${beneficiary}`);
      }
      // Ensure address is checksummed to avoid ENS lookup
      const beneficiaryAddress = ethers.getAddress(beneficiary);
      console.log('   Beneficiary (checksummed):', beneficiaryAddress);
      
      // Check minter balance
      const balance = await provider.getBalance(minterWallet.address);
      console.log('   Minter LEMX Balance:', ethers.formatEther(balance));
      
      if (balance === 0n) {
        throw new Error('Minter wallet has no LEMX for gas fees');
      }
      
      // Validate contract address
      const vusdContractAddress = ethers.getAddress(vusdContract);
      console.log('   VUSD Contract (checksummed):', vusdContractAddress);
      
      // Create VUSD contract instance with minter wallet
      const vusd = new ethers.Contract(
        vusdContractAddress,
        [
          'function mint(address to, uint256 amount)',
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function hasRole(bytes32 role, address account) view returns (bool)',
          'function MINTER_ROLE() view returns (bytes32)'
        ],
        minterWallet
      );
      
      // Verify minter has MINTER_ROLE
      const minterRole = await vusd.MINTER_ROLE();
      const hasMinterRole = await vusd.hasRole(minterRole, minterWallet.address);
      
      if (!hasMinterRole) {
        throw new Error(`Minter wallet ${minterWallet.address} does not have MINTER_ROLE on VUSD contract`);
      }
      
      console.log('   ✅ Minter has MINTER_ROLE');
      
      // Get decimals and calculate amount
      const decimals = await vusd.decimals();
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      console.log('   Amount Wei:', amountWei.toString());
      console.log('   Decimals:', decimals.toString());
      
      // Execute mint transaction (using checksummed address to avoid ENS lookup)
      console.log('%c📤 Ejecutando mint transaction...', 'color: #ffaa00; font-weight: bold;');
      const tx = await vusd.mint(beneficiaryAddress, amountWei, { gasLimit: 200000 });
      console.log('   TX Hash:', tx.hash);
      
      // Wait for confirmation
      console.log('%c⏳ Esperando confirmación...', 'color: #ffaa00;');
      const receipt = await tx.wait();
      
      console.log('%c✅ VUSD MINTED SUCCESSFULLY!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
      console.log('   Block:', receipt.blockNumber);
      console.log('   TX Hash:', receipt.hash);
      console.log('   Explorer: https://explorer.lemonchain.io/tx/' + receipt.hash);
      
      // Verify new balance (using checksummed address)
      const newBalance = await vusd.balanceOf(beneficiaryAddress);
      console.log('   Beneficiary new balance:', ethers.formatUnits(newBalance, decimals), 'VUSD');
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        mintedAmount: amount.toString(),
        beneficiary: beneficiary
      };
      
    } catch (error: any) {
      console.error('%c❌ MINT VUSD DIRECT FAILED:', 'color: #ff0000; font-weight: bold;', error);
      return {
        success: false,
        txHash: '',
        blockNumber: 0,
        mintedAmount: '0',
        beneficiary: beneficiary,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();
