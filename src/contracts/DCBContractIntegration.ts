/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔗 DCB TREASURY - SMART CONTRACT INTEGRATION                                                    ║
 * ║  Frontend Integration for LemonChain Testnet                                                     ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import Web3 from 'web3';

// ═══════════════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES - LEMONCHAIN TESTNET
// ═══════════════════════════════════════════════════════════════════════════════════════

export const TESTNET_ADDRESSES = {
  USD: '',
  LocksTreasuryVUSD: '',
  VUSDMinting: '',
  PriceOracleAggregator: '',
  KYCComplianceRegistry: '',
  PostQuantumSignatureVerifier: '',
  DCBTimelock: '',
  // Will be loaded from deployed-addresses-testnet.json
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

export const LEMONCHAIN_TESTNET = {
  chainId: 1006,
  chainIdHex: '0x3EE',
  name: 'LemonChain Testnet',
  rpcUrl: 'https://rpc.testnet.lemonchain.io',
  explorerUrl: 'https://testnet.explorer.lemonchain.io',
  nativeCurrency: {
    name: 'LEMON',
    symbol: 'LEMON',
    decimals: 18
  }
};

export const LEMONCHAIN_MAINNET = {
  chainId: 1005,
  chainIdHex: '0x3ED',
  name: 'LemonChain Mainnet',
  rpcUrl: 'https://rpc.lemonchain.io',
  explorerUrl: 'https://explorer.lemonchain.io',
  nativeCurrency: {
    name: 'LEMON',
    symbol: 'LEMON',
    decimals: 18
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// MINIMAL ABIs (Only the functions we need)
// ═══════════════════════════════════════════════════════════════════════════════════════

export const USD_ABI = [
  // Read functions
  {
    "inputs": [],
    "name": "VERSION",
    "outputs": [{ "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalCustodyBalance",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalLockedForVUSD",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalInjections",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStatistics",
    "outputs": [
      { "name": "_totalCustodyBalance", "type": "uint256" },
      { "name": "_totalLockedForVUSD", "type": "uint256" },
      { "name": "_totalInjections", "type": "uint256" },
      { "name": "_totalISOMessages", "type": "uint256" },
      { "name": "_totalSupply", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "accountId", "type": "bytes32" }],
    "name": "custodyAccounts",
    "outputs": [
      { "name": "accountId", "type": "bytes32" },
      { "name": "accountName", "type": "string" },
      { "name": "bankName", "type": "string" },
      { "name": "swiftBic", "type": "string" },
      { "name": "accountNumber", "type": "string" },
      { "name": "balance", "type": "uint256" },
      { "name": "lockedBalance", "type": "uint256" },
      { "name": "isActive", "type": "bool" },
      { "name": "owner", "type": "address" },
      { "name": "createdAt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCustodyAccountIds",
    "outputs": [{ "type": "bytes32[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [
      { "name": "accountName", "type": "string" },
      { "name": "bankName", "type": "string" },
      { "name": "swiftBic", "type": "string" },
      { "name": "accountNumber", "type": "string" }
    ],
    "name": "createCustodyAccount",
    "outputs": [{ "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "accountId", "type": "bytes32" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "recordCustodyDeposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "custodyAccountId", "type": "bytes32" },
      { "name": "amount", "type": "uint256" },
      { "name": "beneficiary", "type": "address" },
      { "name": "authorizationCode", "type": "string" }
    ],
    "name": "initiateInjection",
    "outputs": [{ "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "accountId", "type": "bytes32" },
      { "indexed": false, "name": "accountName", "type": "string" },
      { "indexed": false, "name": "bankName", "type": "string" },
      { "indexed": false, "name": "swiftBic", "type": "string" },
      { "indexed": true, "name": "owner", "type": "address" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "CustodyAccountCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "injectionId", "type": "bytes32" },
      { "indexed": true, "name": "custodyAccountId", "type": "bytes32" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": true, "name": "beneficiary", "type": "address" },
      { "indexed": false, "name": "authorizationCode", "type": "string" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "USDInjectionInitiated",
    "type": "event"
  }
];

export const LOCKS_TREASURY_ABI = [
  {
    "inputs": [],
    "name": "getStatistics",
    "outputs": [
      { "name": "_totalLocked", "type": "uint256" },
      { "name": "_totalAvailableForMinting", "type": "uint256" },
      { "name": "_totalConsumedForVUSD", "type": "uint256" },
      { "name": "_totalLocks", "type": "uint256" },
      { "name": "_totalMintingRecords", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "lockId", "type": "bytes32" }],
    "name": "acceptLock",
    "outputs": [{ "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "lockId", "type": "bytes32" },
      { "name": "amount", "type": "uint256" },
      { "name": "lusdTxHash", "type": "bytes32" },
      { "name": "publicationCode", "type": "string" }
    ],
    "name": "consumeForMinting",
    "outputs": [
      { "type": "bytes32" },
      { "type": "bytes32" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const VUSD_MINTING_ABI = [
  {
    "inputs": [],
    "name": "getStatistics",
    "outputs": [
      { "name": "_totalMinted", "type": "uint256" },
      { "name": "_totalMintOperations", "type": "uint256" },
      { "name": "_totalExplorerEntries", "type": "uint256" },
      { "name": "_lusdTotalSupply", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "count", "type": "uint256" }],
    "name": "getRecentEntries",
    "outputs": [{ "type": "tuple[]", "components": [
      { "name": "entryId", "type": "bytes32" },
      { "name": "finalTxHash", "type": "bytes32" },
      { "name": "publicationCode", "type": "string" },
      { "name": "mintedAmount", "type": "uint256" },
      { "name": "beneficiary", "type": "address" },
      { "name": "mintedAt", "type": "uint256" }
    ]}],
    "stateMutability": "view",
    "type": "function"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════════════
// DCB CONTRACT INTEGRATION CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface ContractAddresses {
  USD: string;
  LocksTreasuryVUSD: string;
  VUSDMinting: string;
  PriceOracleAggregator: string;
  KYCComplianceRegistry: string;
  PostQuantumSignatureVerifier: string;
  DCBTimelock: string;
}

export interface CustodyAccount {
  accountId: string;
  accountName: string;
  bankName: string;
  swiftBic: string;
  accountNumber: string;
  balance: string;
  lockedBalance: string;
  isActive: boolean;
  owner: string;
  createdAt: number;
}

export interface ContractStatistics {
  totalCustodyBalance: string;
  totalLockedForVUSD: string;
  totalInjections: number;
  totalMinted: string;
  totalMintOperations: number;
}

export class DCBContractIntegration {
  private web3: Web3 | null = null;
  private addresses: ContractAddresses | null = null;
  private isTestnet: boolean = true;
  private account: string | null = null;

  constructor() {
    // Initialize with empty state
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(useTestnet: boolean = true): Promise<boolean> {
    this.isTestnet = useTestnet;
    const network = useTestnet ? LEMONCHAIN_TESTNET : LEMONCHAIN_MAINNET;

    try {
      // Check if MetaMask is available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.web3 = new Web3((window as any).ethereum);
        
        // Request account access
        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        this.account = accounts[0];

        // Switch to correct network
        await this.switchNetwork(network);

        console.log('✅ DCB Contract Integration initialized');
        console.log(`   Network: ${network.name}`);
        console.log(`   Account: ${this.account}`);

        return true;
      } else {
        // Use RPC provider for read-only operations
        this.web3 = new Web3(network.rpcUrl);
        console.log('⚠️ MetaMask not found, using read-only mode');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      return false;
    }
  }

  async switchNetwork(network: typeof LEMONCHAIN_TESTNET): Promise<void> {
    if (!(window as any).ethereum) return;

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: network.chainIdHex,
            chainName: network.name,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.explorerUrl]
          }],
        });
      }
    }
  }

  setAddresses(addresses: ContractAddresses): void {
    this.addresses = addresses;
    console.log('📋 Contract addresses set:', addresses);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USD CONTRACT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getUSDStatistics(): Promise<ContractStatistics | null> {
    if (!this.web3 || !this.addresses?.USD) return null;

    try {
      const usdContract = new this.web3.eth.Contract(USD_ABI as any, this.addresses.USD);
      const stats = await usdContract.methods.getStatistics().call();

      return {
        totalCustodyBalance: this.web3.utils.fromWei(stats._totalCustodyBalance, 'mwei'),
        totalLockedForVUSD: this.web3.utils.fromWei(stats._totalLockedForVUSD, 'mwei'),
        totalInjections: Number(stats._totalInjections),
        totalMinted: this.web3.utils.fromWei(stats._totalSupply, 'mwei'),
        totalMintOperations: 0
      };
    } catch (error) {
      console.error('Error getting USD statistics:', error);
      return null;
    }
  }

  async getAllCustodyAccounts(): Promise<CustodyAccount[]> {
    if (!this.web3 || !this.addresses?.USD) return [];

    try {
      const usdContract = new this.web3.eth.Contract(USD_ABI as any, this.addresses.USD);
      const accountIds = await usdContract.methods.getAllCustodyAccountIds().call();

      const accounts: CustodyAccount[] = [];
      for (const id of accountIds) {
        const account = await usdContract.methods.custodyAccounts(id).call();
        accounts.push({
          accountId: account.accountId,
          accountName: account.accountName,
          bankName: account.bankName,
          swiftBic: account.swiftBic,
          accountNumber: account.accountNumber,
          balance: this.web3.utils.fromWei(account.balance, 'mwei'),
          lockedBalance: this.web3.utils.fromWei(account.lockedBalance, 'mwei'),
          isActive: account.isActive,
          owner: account.owner,
          createdAt: Number(account.createdAt)
        });
      }

      return accounts;
    } catch (error) {
      console.error('Error getting custody accounts:', error);
      return [];
    }
  }

  async createCustodyAccount(
    accountName: string,
    bankName: string,
    swiftBic: string,
    accountNumber: string
  ): Promise<string | null> {
    if (!this.web3 || !this.addresses?.USD || !this.account) {
      console.error('Not initialized or no account');
      return null;
    }

    try {
      const usdContract = new this.web3.eth.Contract(USD_ABI as any, this.addresses.USD);
      
      const tx = await usdContract.methods.createCustodyAccount(
        accountName,
        bankName,
        swiftBic,
        accountNumber
      ).send({ from: this.account });

      console.log('✅ Custody account created:', tx.transactionHash);
      return tx.transactionHash;
    } catch (error) {
      console.error('Error creating custody account:', error);
      return null;
    }
  }

  async recordDeposit(accountId: string, amount: string): Promise<string | null> {
    if (!this.web3 || !this.addresses?.USD || !this.account) return null;

    try {
      const usdContract = new this.web3.eth.Contract(USD_ABI as any, this.addresses.USD);
      const amountWei = this.web3.utils.toWei(amount, 'mwei'); // 6 decimals

      const tx = await usdContract.methods.recordCustodyDeposit(
        accountId,
        amountWei
      ).send({ from: this.account });

      console.log('✅ Deposit recorded:', tx.transactionHash);
      return tx.transactionHash;
    } catch (error) {
      console.error('Error recording deposit:', error);
      return null;
    }
  }

  async initiateInjection(
    custodyAccountId: string,
    amount: string,
    beneficiary: string,
    authorizationCode: string
  ): Promise<string | null> {
    if (!this.web3 || !this.addresses?.USD || !this.account) return null;

    try {
      const usdContract = new this.web3.eth.Contract(USD_ABI as any, this.addresses.USD);
      const amountWei = this.web3.utils.toWei(amount, 'mwei');

      const tx = await usdContract.methods.initiateInjection(
        custodyAccountId,
        amountWei,
        beneficiary,
        authorizationCode
      ).send({ from: this.account });

      console.log('✅ Injection initiated:', tx.transactionHash);
      return tx.transactionHash;
    } catch (error) {
      console.error('Error initiating injection:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCKS TREASURY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getLocksStatistics(): Promise<any> {
    if (!this.web3 || !this.addresses?.LocksTreasuryVUSD) return null;

    try {
      const contract = new this.web3.eth.Contract(
        LOCKS_TREASURY_ABI as any, 
        this.addresses.LocksTreasuryVUSD
      );
      return await contract.methods.getStatistics().call();
    } catch (error) {
      console.error('Error getting locks statistics:', error);
      return null;
    }
  }

  async acceptLock(lockId: string): Promise<string | null> {
    if (!this.web3 || !this.addresses?.LocksTreasuryVUSD || !this.account) return null;

    try {
      const contract = new this.web3.eth.Contract(
        LOCKS_TREASURY_ABI as any, 
        this.addresses.LocksTreasuryVUSD
      );

      const tx = await contract.methods.acceptLock(lockId).send({ from: this.account });
      console.log('✅ Lock accepted:', tx.transactionHash);
      return tx.transactionHash;
    } catch (error) {
      console.error('Error accepting lock:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VUSD MINTING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getMintingStatistics(): Promise<any> {
    if (!this.web3 || !this.addresses?.VUSDMinting) return null;

    try {
      const contract = new this.web3.eth.Contract(
        VUSD_MINTING_ABI as any, 
        this.addresses.VUSDMinting
      );
      return await contract.methods.getStatistics().call();
    } catch (error) {
      console.error('Error getting minting statistics:', error);
      return null;
    }
  }

  async getRecentMints(count: number = 10): Promise<any[]> {
    if (!this.web3 || !this.addresses?.VUSDMinting) return [];

    try {
      const contract = new this.web3.eth.Contract(
        VUSD_MINTING_ABI as any, 
        this.addresses.VUSDMinting
      );
      return await contract.methods.getRecentEntries(count).call();
    } catch (error) {
      console.error('Error getting recent mints:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  getExplorerUrl(txHash: string): string {
    const baseUrl = this.isTestnet 
      ? LEMONCHAIN_TESTNET.explorerUrl 
      : LEMONCHAIN_MAINNET.explorerUrl;
    return `${baseUrl}/tx/${txHash}`;
  }

  getAddressExplorerUrl(address: string): string {
    const baseUrl = this.isTestnet 
      ? LEMONCHAIN_TESTNET.explorerUrl 
      : LEMONCHAIN_MAINNET.explorerUrl;
    return `${baseUrl}/address/${address}`;
  }

  isConnected(): boolean {
    return this.web3 !== null && this.account !== null;
  }

  getAccount(): string | null {
    return this.account;
  }

  getAddresses(): ContractAddresses | null {
    return this.addresses;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════════════

export const dcbContracts = new DCBContractIntegration();

export default dcbContracts;
