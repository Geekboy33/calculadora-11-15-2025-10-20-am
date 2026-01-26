/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔗 USE SMART CONTRACTS HOOK                                                                     ║
 * ║  React hook for interacting with DCB Treasury smart contracts                                    ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

// Contract ABIs (simplified for key functions)
const USD_ABI = [
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
  {
    "inputs": [],
    "name": "getAllInjectionIds",
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

const LOCKS_TREASURY_ABI = [
  {
    "inputs": [],
    "name": "totalLocked",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAvailableForMinting",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalConsumedForVUSD",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
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
  }
];

const VUSD_MINTING_ABI = [
  {
    "inputs": [],
    "name": "totalMinted",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMintOperations",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
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
  }
];

// Network configuration
const NETWORKS = {
  'lemonchain-testnet': {
    chainId: 1006,
    rpcUrl: 'https://rpc.testnet.lemonchain.io',
    explorerUrl: 'https://testnet.explorer.lemonchain.io',
    name: 'LemonChain Testnet'
  },
  'lemonchain': {
    chainId: 1005,
    rpcUrl: 'https://rpc.lemonchain.io',
    explorerUrl: 'https://explorer.lemonchain.io',
    name: 'LemonChain Mainnet'
  }
};

// Types
export interface ContractAddresses {
  USD: string;
  LocksTreasuryVUSD: string;
  VUSDMinting: string;
  TestCustodyAccountId?: string;
}

export interface ContractStats {
  usd: {
    totalCustodyBalance: string;
    totalLockedForVUSD: string;
    totalInjections: number;
    totalSupply: string;
  };
  locks: {
    totalLocked: string;
    totalAvailableForMinting: string;
    totalConsumedForVUSD: string;
    totalLocks: number;
  };
  minting: {
    totalMinted: string;
    totalMintOperations: number;
  };
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

export interface UseSmartContractsReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  network: string;
  account: string | null;
  addresses: ContractAddresses | null;
  stats: ContractStats | null;
  custodyAccounts: CustodyAccount[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshStats: () => Promise<void>;
  
  // Contract interactions
  createCustodyAccount: (name: string, bankName: string, swiftBic: string, accountNumber: string) => Promise<string>;
  recordDeposit: (accountId: string, amount: string) => Promise<void>;
  initiateInjection: (accountId: string, amount: string, beneficiary: string, authCode: string) => Promise<string>;
  
  // Utilities
  formatAmount: (amount: string | bigint, decimals?: number) => string;
  parseAmount: (amount: string, decimals?: number) => bigint;
}

/**
 * Hook for interacting with DCB Treasury smart contracts
 */
export function useSmartContracts(networkId: string = 'lemonchain-testnet'): UseSmartContractsReturn {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);

  const network = NETWORKS[networkId as keyof typeof NETWORKS];

  // Load deployed addresses
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        // Try to load from local file first
        const response = await fetch('/contracts/testnet-addresses.json');
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.contracts);
        }
      } catch (err) {
        console.log('No deployed addresses found, will use manual configuration');
      }
    };
    loadAddresses();
  }, []);

  // Format amount from wei to human readable
  const formatAmount = useCallback((amount: string | bigint, decimals: number = 6): string => {
    const value = typeof amount === 'bigint' ? amount : BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    return `${integerPart}.${fractionalPart.toString().padStart(decimals, '0')}`;
  }, []);

  // Parse amount from human readable to wei
  const parseAmount = useCallback((amount: string, decimals: number = 6): bigint => {
    const [integer, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
  }, []);

  // Connect to network
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if MetaMask is available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const web3Instance = new Web3((window as any).ethereum);
        
        // Request account access
        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        // Check network
        const chainId = await web3Instance.eth.getChainId();
        if (Number(chainId) !== network.chainId) {
          // Try to switch network
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${network.chainId.toString(16)}` }]
            });
          } catch (switchError: any) {
            // Network not added, try to add it
            if (switchError.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${network.chainId.toString(16)}`,
                  chainName: network.name,
                  rpcUrls: [network.rpcUrl],
                  blockExplorerUrls: [network.explorerUrl]
                }]
              });
            } else {
              throw switchError;
            }
          }
        }

        setWeb3(web3Instance);
        setAccount(accounts[0]);
        setIsConnected(true);

        // Listen for account changes
        (window as any).ethereum.on('accountsChanged', (newAccounts: string[]) => {
          setAccount(newAccounts[0] || null);
          if (!newAccounts[0]) {
            setIsConnected(false);
          }
        });

      } else {
        // Use read-only provider
        const web3Instance = new Web3(network.rpcUrl);
        setWeb3(web3Instance);
        setIsConnected(true);
        console.log('Using read-only mode (no wallet detected)');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [network]);

  // Disconnect
  const disconnect = useCallback(() => {
    setWeb3(null);
    setAccount(null);
    setIsConnected(false);
    setStats(null);
    setCustodyAccounts([]);
  }, []);

  // Refresh stats from contracts
  const refreshStats = useCallback(async () => {
    if (!web3 || !addresses) return;

    setIsLoading(true);
    try {
      const usdContract = new web3.eth.Contract(USD_ABI as any, addresses.USD);
      const locksContract = new web3.eth.Contract(LOCKS_TREASURY_ABI as any, addresses.LocksTreasuryVUSD);
      const mintingContract = new web3.eth.Contract(VUSD_MINTING_ABI as any, addresses.VUSDMinting);

      // Get USD stats
      const usdStats = await usdContract.methods.getStatistics().call();
      
      // Get Locks stats
      const locksStats = await locksContract.methods.getStatistics().call();
      
      // Get Minting stats
      const mintingStats = await mintingContract.methods.getStatistics().call();

      setStats({
        usd: {
          totalCustodyBalance: formatAmount(usdStats._totalCustodyBalance),
          totalLockedForVUSD: formatAmount(usdStats._totalLockedForVUSD),
          totalInjections: Number(usdStats._totalInjections),
          totalSupply: formatAmount(usdStats._totalSupply)
        },
        locks: {
          totalLocked: formatAmount(locksStats._totalLocked),
          totalAvailableForMinting: formatAmount(locksStats._totalAvailableForMinting),
          totalConsumedForVUSD: formatAmount(locksStats._totalConsumedForVUSD),
          totalLocks: Number(locksStats._totalLocks)
        },
        minting: {
          totalMinted: formatAmount(mintingStats._totalMinted),
          totalMintOperations: Number(mintingStats._totalMintOperations)
        }
      });

      // Get custody accounts
      const accountIds = await usdContract.methods.getAllCustodyAccountIds().call() as string[];
      const accounts: CustodyAccount[] = [];
      
      for (const id of accountIds) {
        const accountData = await usdContract.methods.custodyAccounts(id).call();
        accounts.push({
          accountId: accountData.accountId,
          accountName: accountData.accountName,
          bankName: accountData.bankName,
          swiftBic: accountData.swiftBic,
          accountNumber: accountData.accountNumber,
          balance: formatAmount(accountData.balance),
          lockedBalance: formatAmount(accountData.lockedBalance),
          isActive: accountData.isActive,
          owner: accountData.owner,
          createdAt: Number(accountData.createdAt)
        });
      }
      
      setCustodyAccounts(accounts);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
      console.error('Stats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [web3, addresses, formatAmount]);

  // Create custody account
  const createCustodyAccount = useCallback(async (
    name: string,
    bankName: string,
    swiftBic: string,
    accountNumber: string
  ): Promise<string> => {
    if (!web3 || !addresses || !account) {
      throw new Error('Not connected');
    }

    const usdContract = new web3.eth.Contract(USD_ABI as any, addresses.USD);
    
    const tx = await usdContract.methods.createCustodyAccount(
      name,
      bankName,
      swiftBic,
      accountNumber
    ).send({ from: account });

    // Get account ID from event
    const event = tx.events?.CustodyAccountCreated;
    const accountId = event?.returnValues?.accountId;

    await refreshStats();
    return accountId;
  }, [web3, addresses, account, refreshStats]);

  // Record deposit
  const recordDeposit = useCallback(async (
    accountId: string,
    amount: string
  ): Promise<void> => {
    if (!web3 || !addresses || !account) {
      throw new Error('Not connected');
    }

    const usdContract = new web3.eth.Contract(USD_ABI as any, addresses.USD);
    const amountWei = parseAmount(amount);

    await usdContract.methods.recordCustodyDeposit(
      accountId,
      amountWei.toString()
    ).send({ from: account });

    await refreshStats();
  }, [web3, addresses, account, parseAmount, refreshStats]);

  // Initiate injection
  const initiateInjection = useCallback(async (
    accountId: string,
    amount: string,
    beneficiary: string,
    authCode: string
  ): Promise<string> => {
    if (!web3 || !addresses || !account) {
      throw new Error('Not connected');
    }

    const usdContract = new web3.eth.Contract(USD_ABI as any, addresses.USD);
    const amountWei = parseAmount(amount);

    const tx = await usdContract.methods.initiateInjection(
      accountId,
      amountWei.toString(),
      beneficiary,
      authCode
    ).send({ from: account });

    const event = tx.events?.USDInjectionInitiated;
    const injectionId = event?.returnValues?.injectionId;

    await refreshStats();
    return injectionId;
  }, [web3, addresses, account, parseAmount, refreshStats]);

  // Auto-refresh stats when connected
  useEffect(() => {
    if (isConnected && addresses) {
      refreshStats();
      
      // Refresh every 30 seconds
      const interval = setInterval(refreshStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, addresses, refreshStats]);

  return {
    isConnected,
    isLoading,
    error,
    network: network?.name || networkId,
    account,
    addresses,
    stats,
    custodyAccounts,
    connect,
    disconnect,
    refreshStats,
    createCustodyAccount,
    recordDeposit,
    initiateInjection,
    formatAmount,
    parseAmount
  };
}

export default useSmartContracts;
