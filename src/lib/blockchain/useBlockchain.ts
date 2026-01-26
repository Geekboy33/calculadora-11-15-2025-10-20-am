// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN REACT HOOK - Treasury Minting LemonChain Platform
// React hook for blockchain interactions
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { blockchainService, LEMONCHAIN_CONFIG, CONTRACT_ADDRESSES } from './contracts';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface NetworkStats {
  blockNumber: number;
  gasPrice: string;
  transactionCount: number;
  isConnected: boolean;
  chainId: number;
  chainName: string;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface VUSDStats {
  totalSupply: string;
  balance: string;
}

export interface ContractStatus {
  name: string;
  address: string;
  isDeployed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export function useBlockchain() {
  // Network state
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    blockNumber: 0,
    gasPrice: '0',
    transactionCount: 0,
    isConnected: false,
    chainId: LEMONCHAIN_CONFIG.chainId,
    chainName: LEMONCHAIN_CONFIG.name
  });
  
  // Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null
  });
  
  // VUSD stats
  const [lusdStats, setLusdStats] = useState<VUSDStats>({
    totalSupply: '0',
    balance: '0'
  });
  
  // Contract statuses
  const [contracts, setContracts] = useState<ContractStatus[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // NETWORK FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const fetchNetworkStats = useCallback(async () => {
    try {
      const [blockNumber, gasPrice, txCount] = await Promise.all([
        blockchainService.getBlockNumber(),
        blockchainService.getGasPrice(),
        blockchainService.getTransactionCount()
      ]);
      
      setNetworkStats(prev => ({
        ...prev,
        blockNumber,
        gasPrice: blockchainService.formatAmount(gasPrice, 9), // Gwei
        transactionCount: txCount,
        isConnected: true
      }));
    } catch (error) {
      console.error('[useBlockchain] Error fetching network stats:', error);
      setNetworkStats(prev => ({ ...prev, isConnected: false }));
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // WALLET FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const connectWallet = useCallback(async () => {
    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const address = await blockchainService.connectWallet();
      setWallet({
        address,
        isConnected: true,
        isConnecting: false,
        error: null
      });
      
      // Fetch VUSD balance for connected wallet
      if (CONTRACT_ADDRESSES.VUSD !== '0x0000000000000000000000000000000000000000') {
        const balance = await blockchainService.getVUSDBalance(address);
        setLusdStats(prev => ({
          ...prev,
          balance: blockchainService.formatAmount(balance)
        }));
      }
      
      return address;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect wallet';
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);
  
  const disconnectWallet = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null
    });
    setLusdStats({ totalSupply: '0', balance: '0' });
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // VUSD FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const fetchVUSDStats = useCallback(async () => {
    if (CONTRACT_ADDRESSES.VUSD === '0x0000000000000000000000000000000000000000') {
      return;
    }
    
    try {
      const totalSupply = await blockchainService.getVUSDTotalSupply();
      setLusdStats(prev => ({
        ...prev,
        totalSupply: blockchainService.formatAmount(totalSupply)
      }));
      
      if (wallet.address) {
        const balance = await blockchainService.getVUSDBalance(wallet.address);
        setLusdStats(prev => ({
          ...prev,
          balance: blockchainService.formatAmount(balance)
        }));
      }
    } catch (error) {
      console.error('[useBlockchain] Error fetching VUSD stats:', error);
    }
  }, [wallet.address]);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // CONTRACT STATUS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const checkContractStatuses = useCallback(() => {
    const statuses: ContractStatus[] = [
      {
        name: 'VUSD Token',
        address: CONTRACT_ADDRESSES.VUSD,
        isDeployed: CONTRACT_ADDRESSES.VUSD !== '0x0000000000000000000000000000000000000000'
      },
      {
        name: 'LockBox',
        address: CONTRACT_ADDRESSES.LockBox,
        isDeployed: CONTRACT_ADDRESSES.LockBox !== '0x0000000000000000000000000000000000000000'
      },
      {
        name: 'CustodyVault',
        address: CONTRACT_ADDRESSES.CustodyVault,
        isDeployed: CONTRACT_ADDRESSES.CustodyVault !== '0x0000000000000000000000000000000000000000'
      },
      {
        name: 'LocksTreasuryVUSD',
        address: CONTRACT_ADDRESSES.LocksTreasuryVUSD,
        isDeployed: CONTRACT_ADDRESSES.LocksTreasuryVUSD !== '0x0000000000000000000000000000000000000000'
      },
      {
        name: 'VUSDMinting',
        address: CONTRACT_ADDRESSES.VUSDMinting,
        isDeployed: CONTRACT_ADDRESSES.VUSDMinting !== '0x0000000000000000000000000000000000000000'
      },
      {
        name: 'MintingBridge',
        address: CONTRACT_ADDRESSES.MintingBridge,
        isDeployed: CONTRACT_ADDRESSES.MintingBridge !== '0x0000000000000000000000000000000000000000'
      }
    ];
    
    setContracts(statuses);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // LOCK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const acceptLockOnChain = useCallback(async (lockId: string) => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    try {
      const tx = await blockchainService.acceptLock(lockId);
      const receipt = await tx.wait();
      return {
        txHash: receipt?.hash || tx.hash,
        blockNumber: receipt?.blockNumber || 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected]);
  
  const consumeForMintingOnChain = useCallback(async (
    lockId: string,
    amount: string,
    lusdTxHash: string,
    publicationCode: string
  ) => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    try {
      const amountBigInt = blockchainService.parseAmount(amount);
      const tx = await blockchainService.consumeForMinting(lockId, amountBigInt, lusdTxHash, publicationCode);
      const receipt = await tx.wait();
      return {
        txHash: receipt?.hash || tx.hash,
        blockNumber: receipt?.blockNumber || 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected]);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // MINTING OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  const mintAndPublishOnChain = useCallback(async (
    lockId: string,
    amount: string,
    beneficiary: string,
    authorizationCode: string,
    bankName: string,
    firstSignature: string,
    secondSignature: string
  ) => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    try {
      const amountBigInt = blockchainService.parseAmount(amount);
      const txHash = blockchainService.generateSignatureHash(`${lockId}-${amount}-${Date.now()}`);
      
      const tx = await blockchainService.mintAndPublish(
        lockId,
        amountBigInt,
        beneficiary,
        txHash,
        authorizationCode,
        bankName,
        firstSignature,
        secondSignature
      );
      
      const receipt = await tx.wait();
      return {
        txHash: receipt?.hash || tx.hash,
        blockNumber: receipt?.blockNumber || 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected]);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  // Initial load
  useEffect(() => {
    fetchNetworkStats();
    checkContractStatuses();
    fetchVUSDStats();
    
    // Poll network stats every 5 seconds
    const interval = setInterval(fetchNetworkStats, 5000);
    return () => clearInterval(interval);
  }, [fetchNetworkStats, checkContractStatuses, fetchVUSDStats]);
  
  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== wallet.address) {
          setWallet(prev => ({ ...prev, address: accounts[0] }));
          fetchVUSDStats();
        }
      };
      
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [wallet.address, disconnectWallet, fetchVUSDStats]);
  
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  
  return {
    // State
    networkStats,
    wallet,
    lusdStats,
    contracts,
    isLoading,
    
    // Network
    fetchNetworkStats,
    
    // Wallet
    connectWallet,
    disconnectWallet,
    
    // VUSD
    fetchVUSDStats,
    
    // Lock Operations
    acceptLockOnChain,
    consumeForMintingOnChain,
    
    // Minting Operations
    mintAndPublishOnChain,
    
    // Utilities
    formatAmount: blockchainService.formatAmount.bind(blockchainService),
    parseAmount: blockchainService.parseAmount.bind(blockchainService),
    getExplorerUrl: blockchainService.getExplorerUrl.bind(blockchainService),
    getAddressExplorerUrl: blockchainService.getAddressExplorerUrl.bind(blockchainService),
    isValidAddress: blockchainService.isValidAddress.bind(blockchainService),
    
    // Config
    config: LEMONCHAIN_CONFIG,
    contractAddresses: CONTRACT_ADDRESSES
  };
}

export default useBlockchain;
