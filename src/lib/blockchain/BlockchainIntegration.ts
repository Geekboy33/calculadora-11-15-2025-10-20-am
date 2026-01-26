/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║  🔗 BLOCKCHAIN INTEGRATION - DCB Treasury & Treasury Minting                                                                 ║
 * ║                                                                                                                              ║
 * ║  Network: LemonChain Mainnet (Chain ID: 1006)                                                                                ║
 * ║  Contracts: PriceOracle, USD, LockReserve, VUSDMinter                                                                        ║
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
// CONTRACT ADDRESSES - DEPLOYED ON LEMONCHAIN
// ══════════════════════════════════════════════════════════════════════════════

export const CONTRACT_ADDRESSES = {
  // Official VUSD Token
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  
  // DCB Treasury V5 Contracts - DEPLOYED & VERIFIED ON LEMONCHAIN (Chain ID: 1006) - Jan 2026
  // All contracts verified on https://explorer.lemonchain.io
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',      // Price feeds
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',              // USDTokenized (First Signature)
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',      // LockReserve (Second Signature)
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',       // VUSDMinter (Third Signature)
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531'  // Cross-chain bridge
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT ABIs
// ══════════════════════════════════════════════════════════════════════════════

export const USD_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalInjected() view returns (uint256)',
  'function totalInLockReserve() view returns (uint256)',
  'function totalConsumedForVUSD() view returns (uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function injectFromDAES(uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash) returns (bytes32)',
  'event USDInjected(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary, bytes32 dcbSignature, uint256 timestamp)'
];

export const LOCK_RESERVE_ABI = [
  'function totalReserve() view returns (uint256)',
  'function totalConsumed() view returns (uint256)',
  'function totalLocks() view returns (uint256)',
  'function getAvailableReserve(bytes32 lockId) view returns (uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function verifySignatures(bytes32 lockId) view returns (bool, bool, bool, bytes32, bytes32, bytes32)',
  'function receiveLock(bytes32 usdInjectionId, uint256 amount, address beneficiary, bytes32 firstSignature) returns (bytes32)',
  'function acceptLock(bytes32 lockId) returns (bytes32, string)',
  'function moveToReserve(bytes32 lockId)',
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, uint256 amount, address indexed beneficiary, bytes32 firstSignature, uint256 timestamp)',
  'event LockAccepted(bytes32 indexed lockId, address indexed acceptedBy, bytes32 secondSignature, string authorizationCode, uint256 timestamp)',
  'event MovedToReserve(bytes32 indexed lockId, uint256 amount, uint256 timestamp)'
];

export const VUSD_MINTER_ABI = [
  'function totalBacked() view returns (uint256)',
  'function totalCertificates() view returns (uint256)',
  'function verifyBackedSignature(bytes32 backedSignature) view returns (bool, bytes32, uint256, uint256)',
  'function getBackingProof(bytes32 emisorTxHash) view returns (bool, bytes32, uint256, uint256, address, uint256)',
  'function getStatistics() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function generateBackedSignature(bytes32 lockReserveId, uint256 amount, address beneficiary, bytes32 emisorTxHash, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32, bytes32, string)',
  'event BackedSignatureGenerated(bytes32 indexed certificateId, bytes32 indexed backedSignature, bytes32 emisorTxHash, address indexed emisor, uint256 usdAmount, uint256 lusdMinted, uint256 timestamp)',
  'event CertificatePublished(bytes32 indexed certificateId, string publicationCode, bytes32 backedSignature, uint256 usdBacking, uint256 lusdMinted, uint256 backingRatio, address beneficiary, uint256 timestamp)'
];

export const PRICE_ORACLE_ABI = [
  'function getPrice(string symbol) view returns (int256)',
  'function getUSDPrice() view returns (int256)',
  'function getVUSDPrice() view returns (int256)',
  'function getAllStablecoinPrices() view returns (int256, int256, int256, int256, uint256)'
];

// ══════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN INTEGRATION CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class BlockchainIntegration {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: {
    usd: ethers.Contract | null;
    lockReserve: ethers.Contract | null;
    lusdMinter: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
  } = {
    usd: null,
    lockReserve: null,
    lusdMinter: null,
    priceOracle: null
  };
  
  private isConnected = false;
  private walletAddress = '';

  // ══════════════════════════════════════════════════════════════════════════════
  // WALLET CONNECTION
  // ══════════════════════════════════════════════════════════════════════════════

  async connectWallet(): Promise<{ address: string; chainId: number }> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await this.provider.send('eth_requestAccounts', []);
    
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== LEMONCHAIN_CONFIG.chainId) {
      await this.switchToLemonChain();
    }
    
    this.signer = await this.provider.getSigner();
    this.walletAddress = accounts[0];
    this.isConnected = true;
    
    this.initializeContracts();
    
    return { address: accounts[0], chainId: Number(network.chainId) };
  }

  /**
   * Connect directly with a private key (for direct connection without MetaMask)
   * This allows signing real transactions on LemonChain
   */
  async connectWithPrivateKey(privateKey: string): Promise<{ address: string; chainId: number }> {
    console.log('🔗 [Blockchain] Connecting with private key to LemonChain...');
    
    // Create JSON-RPC provider for LemonChain
    this.provider = new ethers.JsonRpcProvider(LEMONCHAIN_CONFIG.rpcUrl);
    
    // Create wallet from private key and connect to provider
    const wallet = new ethers.Wallet(privateKey, this.provider);
    this.signer = wallet;
    this.walletAddress = wallet.address;
    this.isConnected = true;
    
    console.log('🔗 [Blockchain] Connected wallet:', wallet.address);
    
    // Initialize contracts with the signer
    this.initializeContracts();
    
    return { address: wallet.address, chainId: LEMONCHAIN_CONFIG.chainId };
  }

  /**
   * Disconnect and reset state
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contracts = {
      usd: null,
      lockReserve: null,
      lusdMinter: null,
      priceOracle: null
    };
    this.isConnected = false;
    this.walletAddress = '';
    console.log('🔗 [Blockchain] Disconnected');
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

    this.contracts.usd = new ethers.Contract(CONTRACT_ADDRESSES.USD, USD_ABI, this.signer);
    this.contracts.lockReserve = new ethers.Contract(CONTRACT_ADDRESSES.LockReserve, LOCK_RESERVE_ABI, this.signer);
    this.contracts.lusdMinter = new ethers.Contract(CONTRACT_ADDRESSES.VUSDMinter, VUSD_MINTER_ABI, this.signer);
    this.contracts.priceOracle = new ethers.Contract(CONTRACT_ADDRESSES.PriceOracle, PRICE_ORACLE_ABI, this.signer);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY FUNCTIONS (USD Contract - First Signature)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Injects USD from DAES system - FIRST SIGNATURE
   * Called when creating custody in DCB Treasury
   */
  async injectUSDFromDAES(
    amount: number,
    beneficiary: string,
    daesTransactionId: string,
    xmlContent: string
  ): Promise<{
    injectionId: string;
    firstSignature: string;
    txHash: string;
    blockNumber: number;
  }> {
    if (!this.contracts.usd) throw new Error('USD contract not initialized. Connect wallet first.');

    // Convert amount to 6 decimals (USD uses 6 decimals)
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    
    // Generate XML hash
    const xmlHash = ethers.keccak256(ethers.toUtf8Bytes(xmlContent));

    console.log('🔗 [Blockchain] Injecting USD from DAES...');
    console.log('   Amount:', amount, 'USD');
    console.log('   Beneficiary:', beneficiary);
    console.log('   DAES TX ID:', daesTransactionId);

    const tx = await this.contracts.usd.injectFromDAES(
      amountWei,
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
    const injectionId = parsed?.args?.injectionId || '';
    const firstSignature = parsed?.args?.dcbSignature || '';

    console.log('✅ [Blockchain] USD Injected!');
    console.log('   Injection ID:', injectionId);
    console.log('   First Signature:', firstSignature);
    console.log('   TX Hash:', receipt.hash);

    return {
      injectionId,
      firstSignature,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TREASURY MINTING FUNCTIONS (LockReserve Contract - Second Signature)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Receives a lock from DCB Treasury
   * Called when Treasury Minting receives a pending lock
   */
  async receiveLock(
    injectionId: string,
    amount: number,
    beneficiary: string,
    firstSignature: string
  ): Promise<{
    lockId: string;
    txHash: string;
    blockNumber: number;
  }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    const amountWei = ethers.parseUnits(amount.toString(), 6);

    console.log('🔗 [Blockchain] Receiving lock in LockReserve...');

    const tx = await this.contracts.lockReserve.receiveLock(
      injectionId,
      amountWei,
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
    const lockId = parsed?.args?.lockId || '';

    console.log('✅ [Blockchain] Lock Received!');
    console.log('   Lock ID:', lockId);

    return {
      lockId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * Accepts a lock - generates SECOND SIGNATURE
   * Called when user clicks "Approve" in Treasury Minting
   */
  async acceptLock(lockId: string): Promise<{
    secondSignature: string;
    authorizationCode: string;
    txHash: string;
    blockNumber: number;
  }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    console.log('🔗 [Blockchain] Accepting lock (Second Signature)...');

    const tx = await this.contracts.lockReserve.acceptLock(lockId);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.lockReserve!.interface.parseLog(log);
        return parsed?.name === 'LockAccepted';
      } catch { return false; }
    });
    
    const parsed = this.contracts.lockReserve.interface.parseLog(event);
    const secondSignature = parsed?.args?.secondSignature || '';
    const authorizationCode = parsed?.args?.authorizationCode || '';

    console.log('✅ [Blockchain] Lock Accepted!');
    console.log('   Second Signature:', secondSignature);
    console.log('   Authorization Code:', authorizationCode);

    return {
      secondSignature,
      authorizationCode,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * Moves lock to reserve
   */
  async moveToReserve(lockId: string): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.contracts.lockReserve) throw new Error('LockReserve contract not initialized');

    console.log('🔗 [Blockchain] Moving lock to reserve...');

    const tx = await this.contracts.lockReserve.moveToReserve(lockId);
    const receipt = await tx.wait();

    console.log('✅ [Blockchain] Lock moved to reserve!');

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MINT WITH CODE FUNCTIONS (VUSDMinter Contract - Third Signature / Backed)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Generates BACKED SIGNATURE (Third Signature) and mints VUSD
   * Called when user clicks "Mint" in Mint With Code
   */
  async generateBackedSignatureAndMint(
    lockId: string,
    amount: number,
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
    blockNumber: number;
  }> {
    if (!this.contracts.lusdMinter) throw new Error('VUSDMinter contract not initialized');

    const amountWei = ethers.parseUnits(amount.toString(), 6);

    console.log('🔗 [Blockchain] Generating Backed Signature (Third Signature)...');
    console.log('   Lock ID:', lockId);
    console.log('   Amount:', amount, 'VUSD');

    const tx = await this.contracts.lusdMinter.generateBackedSignature(
      lockId,
      amountWei,
      beneficiary,
      emisorTxHash,
      authorizationCode,
      firstSignature,
      secondSignature
    );
    
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.lusdMinter!.interface.parseLog(log);
        return parsed?.name === 'BackedSignatureGenerated';
      } catch { return false; }
    });
    
    const parsed = this.contracts.lusdMinter.interface.parseLog(event);
    const certificateId = parsed?.args?.certificateId || '';
    const backedSignature = parsed?.args?.backedSignature || '';

    // Get publication code from CertificatePublished event
    const pubEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.lusdMinter!.interface.parseLog(log);
        return parsed?.name === 'CertificatePublished';
      } catch { return false; }
    });
    
    const pubParsed = this.contracts.lusdMinter.interface.parseLog(pubEvent);
    const publicationCode = pubParsed?.args?.publicationCode || '';

    console.log('✅ [Blockchain] VUSD Minted with Backed Signature!');
    console.log('   Certificate ID:', certificateId);
    console.log('   Backed Signature (3rd):', backedSignature);
    console.log('   Publication Code:', publicationCode);

    return {
      certificateId,
      backedSignature,
      publicationCode,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VERIFICATION FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  async verifyBackedSignature(backedSignature: string): Promise<{
    isValid: boolean;
    certificateId: string;
    usdBacking: string;
    lusdMinted: string;
  }> {
    if (!this.contracts.lusdMinter) throw new Error('VUSDMinter contract not initialized');

    const result = await this.contracts.lusdMinter.verifyBackedSignature(backedSignature);
    return {
      isValid: result[0],
      certificateId: result[1],
      usdBacking: ethers.formatUnits(result[2], 6),
      lusdMinted: ethers.formatUnits(result[3], 6)
    };
  }

  async getStatistics(): Promise<{
    usd: { totalSupply: string; totalInjected: string; totalInReserve: string; totalConsumed: string };
    lockReserve: { totalReserve: string; totalConsumed: string; totalLocks: number };
    lusdMinter: { totalBacked: string; totalCertificates: number };
  }> {
    if (!this.contracts.usd || !this.contracts.lockReserve || !this.contracts.lusdMinter) {
      throw new Error('Contracts not initialized');
    }

    const usdStats = await this.contracts.usd.getStatistics();
    const lockStats = await this.contracts.lockReserve.getStatistics();
    const minterStats = await this.contracts.lusdMinter.getStatistics();

    return {
      usd: {
        totalSupply: ethers.formatUnits(usdStats[0], 6),
        totalInjected: ethers.formatUnits(usdStats[1], 6),
        totalInReserve: ethers.formatUnits(usdStats[2], 6),
        totalConsumed: ethers.formatUnits(usdStats[3], 6)
      },
      lockReserve: {
        totalReserve: ethers.formatUnits(lockStats[0], 6),
        totalConsumed: ethers.formatUnits(lockStats[1], 6),
        totalLocks: Number(lockStats[2])
      },
      lusdMinter: {
        totalBacked: ethers.formatUnits(minterStats[0], 6),
        totalCertificates: Number(minterStats[1])
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  getWalletAddress(): string {
    return this.walletAddress;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getExplorerTxUrl(txHash: string): string {
    return `${LEMONCHAIN_CONFIG.explorerUrl}/tx/${txHash}`;
  }

  getExplorerAddressUrl(address: string): string {
    return `${LEMONCHAIN_CONFIG.explorerUrl}/address/${address}`;
  }

  generateXmlContent(data: {
    amount: number;
    currency: string;
    beneficiary: string;
    reference: string;
    bankId: string;
    bankName: string;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${data.reference}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf><SttlmMtd>CLRG</SttlmMtd></SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId><EndToEndId>${data.reference}</EndToEndId></PmtId>
      <IntrBkSttlmAmt Ccy="${data.currency}">${data.amount}</IntrBkSttlmAmt>
      <InstgAgt><FinInstnId><BICFI>${data.bankId}</BICFI><Nm>${data.bankName}</Nm></FinInstnId></InstgAgt>
      <Cdtr><Nm>${data.beneficiary}</Nm></Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
  }
}

// Export singleton instance
export const blockchainIntegration = new BlockchainIntegration();
