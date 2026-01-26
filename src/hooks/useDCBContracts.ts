/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔗 DCB TREASURY - SMART CONTRACT INTEGRATION HOOK                                               ║
 * ║  Digital Commercial Bank Ltd                                                                     ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  CURRENT_CONTRACTS, 
  CURRENT_NETWORK, 
  IS_TESTNET,
  getContracts,
  getNetwork 
} from '../contracts/ContractAddresses';

// ABIs (simplified for essential functions)
const USD_ABI = [
  "function createCustodyAccount(string accountName, string bankName, string swiftBic, string accountNumber) returns (bytes32)",
  "function recordCustodyDeposit(bytes32 accountId, uint256 amount)",
  "function initiateInjection(bytes32 custodyAccountId, uint256 amount, address beneficiary, string authorizationCode) returns (bytes32)",
  "function getStatistics() view returns (uint256 totalCustodyBalance, uint256 totalLockedForVUSD, uint256 totalInjections, uint256 totalSupply)",
  "function custodyAccounts(bytes32) view returns (bytes32 accountId, string accountName, string bankName, string swiftBic, string accountNumber, uint256 balance, uint256 lockedBalance, bool isActive, address owner, uint256 createdAt)",
  "function injections(bytes32) view returns (bytes32 injectionId, bytes32 custodyAccountId, uint256 amount, uint8 isoType, bytes32 isoMessageHash, bytes32 jsonProofHash, uint8 status, address beneficiary, uint256 createdAt, uint256 expiresAt, bytes32 lemxLockId, string authorizationCode)",
  "function totalCustodyBalance() view returns (uint256)",
  "function totalLockedForVUSD() view returns (uint256)",
  "function totalInjections() view returns (uint256)",
  "event CustodyAccountCreated(bytes32 indexed accountId, string accountName, string bankName, string swiftBic, address indexed owner, uint256 timestamp)",
  "event USDInjectionInitiated(bytes32 indexed injectionId, bytes32 indexed custodyAccountId, uint256 amount, address indexed beneficiary, string authorizationCode, uint256 timestamp)"
];

const LOCKS_TREASURY_ABI = [
  "function receiveLock(bytes32 usdInjectionId, string authorizationCode, uint256 amount, address beneficiary, bytes32 firstSignatureHash) returns (bytes32)",
  "function acceptLock(bytes32 lockId) returns (bytes32)",
  "function moveToReserve(bytes32 lockId)",
  "function approvePartialAmount(bytes32 lockId, uint256 amount)",
  "function consumeForMinting(bytes32 lockId, uint256 amount, bytes32 lusdTxHash, string publicationCode) returns (bytes32, bytes32)",
  "function getStatistics() view returns (uint256 totalLocked, uint256 totalAvailableForMinting, uint256 totalConsumedForVUSD, uint256 totalLocks, uint256 totalMintingRecords)",
  "function locks(bytes32) view returns (bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, uint256 originalAmount, uint256 availableAmount, uint256 consumedAmount, uint256 reserveAmount, address beneficiary, address dcbTreasury, address lemxOperator, uint8 status, bytes32 firstSignatureHash, bytes32 secondSignatureHash, bytes32 thirdSignatureHash)",
  "event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, string authorizationCode, uint256 amount, address indexed beneficiary, uint256 timestamp)",
  "event LockAccepted(bytes32 indexed lockId, address indexed lemxOperator, bytes32 secondSignatureHash, uint256 timestamp)"
];

const VUSD_MINTING_ABI = [
  "function createMintRequest(bytes32 lockId, uint256 amount, string authorizationCode) returns (bytes32)",
  "function mintAndPublish(bytes32 lockId, uint256 amount, address beneficiary, bytes32 txHash, string authorizationCode, string bankName, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32, string)",
  "function getStatistics() view returns (uint256 totalMinted, uint256 totalMintOperations, uint256 totalExplorerEntries, uint256 lusdTotalSupply)",
  "function explorerEntries(bytes32) view returns (bytes32 entryId, bytes32 finalTxHash, uint256 blockNumber, uint256 blockTimestamp, string publicationCode, uint256 mintedAmount, address beneficiary, address mintedBy, bytes32 lockId, bytes32 usdInjectionId, string authorizationCode, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, string bankName, string bankId)",
  "event VUSDMinted(bytes32 indexed entryId, bytes32 indexed finalTxHash, string publicationCode, uint256 amount, address indexed beneficiary, uint256 timestamp)"
];

const PRICE_ORACLE_ABI = [
  "function getLatestPrice() view returns (int256 price, uint8 decimals, uint256 timestamp, bool isValid)",
  "function validatePriceForMinting() view returns (bool isValid, int256 price, uint256 deviation)"
];

const KYC_REGISTRY_ABI = [
  "function isVerified(address account) view returns (bool)",
  "function getKYCLevel(address account) view returns (uint8)",
  "function isTransactionAllowed(address account, uint256 amount, string txType) view returns (bool allowed, string reason)"
];

// Types
interface ContractStats {
  totalCustodyBalance: bigint;
  totalLockedForVUSD: bigint;
  totalInjections: bigint;
  totalSupply: bigint;
}

interface CustodyAccount {
  accountId: string;
  accountName: string;
  bankName: string;
  swiftBic: string;
  accountNumber: string;
  balance: bigint;
  lockedBalance: bigint;
  isActive: boolean;
  owner: string;
  createdAt: bigint;
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

interface DCBContractsHook {
  // Wallet
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  
  // Contracts
  contracts: {
    usd: ethers.Contract | null;
    locksTreasury: ethers.Contract | null;
    lusdMinting: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
    kycRegistry: ethers.Contract | null;
  };
  
  // Stats
  stats: ContractStats | null;
  refreshStats: () => Promise<void>;
  
  // Operations
  createCustodyAccount: (name: string, bankName: string, swiftBic: string, accountNumber: string) => Promise<string>;
  depositToCustody: (accountId: string, amount: string) => Promise<void>;
  initiateInjection: (accountId: string, amount: string, beneficiary: string, authCode: string) => Promise<string>;
  
  // Status
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Main hook for DCB Treasury contract interactions
 */
export function useDCBContracts(): DCBContractsHook {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false
  });
  
  const [contracts, setContracts] = useState<{
    usd: ethers.Contract | null;
    locksTreasury: ethers.Contract | null;
    lusdMinting: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
    kycRegistry: ethers.Contract | null;
  }>({
    usd: null,
    locksTreasury: null,
    lusdMinting: null,
    priceOracle: null,
    kycRegistry: null
  });
  
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask not installed');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Get chain ID
      const chainIdHex = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      const chainId = parseInt(chainIdHex, 16);

      const isCorrectNetwork = chainId === CURRENT_NETWORK.chainId;

      setWallet({
        address: accounts[0],
        chainId,
        isConnected: true,
        isCorrectNetwork
      });

      // Initialize contracts if on correct network
      if (isCorrectNetwork) {
        await initializeContracts();
      }

    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Switch network
  const switchNetwork = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CURRENT_NETWORK.chainId.toString(16)}` }]
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${CURRENT_NETWORK.chainId.toString(16)}`,
            chainName: CURRENT_NETWORK.name,
            rpcUrls: [CURRENT_NETWORK.rpcUrl],
            blockExplorerUrls: [CURRENT_NETWORK.explorerUrl],
            nativeCurrency: CURRENT_NETWORK.currency
          }]
        });
      }
    }
  }, []);

  // Initialize contracts
  const initializeContracts = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractAddresses = getContracts(CURRENT_NETWORK.chainId);

      // Only initialize if addresses are set
      const newContracts = {
        usd: contractAddresses.USD !== ethers.ZeroAddress 
          ? new ethers.Contract(contractAddresses.USD, USD_ABI, signer)
          : null,
        locksTreasury: contractAddresses.LocksTreasuryVUSD !== ethers.ZeroAddress
          ? new ethers.Contract(contractAddresses.LocksTreasuryVUSD, LOCKS_TREASURY_ABI, signer)
          : null,
        lusdMinting: contractAddresses.VUSDMinting !== ethers.ZeroAddress
          ? new ethers.Contract(contractAddresses.VUSDMinting, VUSD_MINTING_ABI, signer)
          : null,
        priceOracle: contractAddresses.PriceOracleAggregator !== ethers.ZeroAddress
          ? new ethers.Contract(contractAddresses.PriceOracleAggregator, PRICE_ORACLE_ABI, signer)
          : null,
        kycRegistry: contractAddresses.KYCComplianceRegistry !== ethers.ZeroAddress
          ? new ethers.Contract(contractAddresses.KYCComplianceRegistry, KYC_REGISTRY_ABI, signer)
          : null
      };

      setContracts(newContracts);

      // Fetch initial stats
      if (newContracts.usd) {
        await refreshStats();
      }

    } catch (err: any) {
      console.error('Failed to initialize contracts:', err);
      setError('Failed to initialize contracts');
    }
  }, []);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!contracts.usd) return;

    try {
      const [totalCustodyBalance, totalLockedForVUSD, totalInjections, totalSupply] = 
        await contracts.usd.getStatistics();

      setStats({
        totalCustodyBalance,
        totalLockedForVUSD,
        totalInjections,
        totalSupply
      });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }, [contracts.usd]);

  // Create custody account
  const createCustodyAccount = useCallback(async (
    name: string, 
    bankName: string, 
    swiftBic: string, 
    accountNumber: string
  ): Promise<string> => {
    if (!contracts.usd) throw new Error('Contract not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contracts.usd.createCustodyAccount(name, bankName, swiftBic, accountNumber);
      setTxHash(tx.hash);
      
      const receipt = await tx.wait();
      
      // Parse event to get account ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contracts.usd!.interface.parseLog(log);
          return parsed?.name === 'CustodyAccountCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contracts.usd.interface.parseLog(event);
        await refreshStats();
        return parsed?.args[0];
      }

      throw new Error('Account creation event not found');

    } catch (err: any) {
      setError(err.message || 'Failed to create custody account');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contracts.usd, refreshStats]);

  // Deposit to custody
  const depositToCustody = useCallback(async (accountId: string, amount: string) => {
    if (!contracts.usd) throw new Error('Contract not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const amountWei = ethers.parseUnits(amount, 6); // USD has 6 decimals
      const tx = await contracts.usd.recordCustodyDeposit(accountId, amountWei);
      setTxHash(tx.hash);
      await tx.wait();
      await refreshStats();

    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contracts.usd, refreshStats]);

  // Initiate injection
  const initiateInjection = useCallback(async (
    accountId: string,
    amount: string,
    beneficiary: string,
    authCode: string
  ): Promise<string> => {
    if (!contracts.usd) throw new Error('Contract not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const amountWei = ethers.parseUnits(amount, 6);
      const tx = await contracts.usd.initiateInjection(accountId, amountWei, beneficiary, authCode);
      setTxHash(tx.hash);
      
      const receipt = await tx.wait();
      
      // Parse event to get injection ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contracts.usd!.interface.parseLog(log);
          return parsed?.name === 'USDInjectionInitiated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contracts.usd.interface.parseLog(event);
        await refreshStats();
        return parsed?.args[0];
      }

      throw new Error('Injection event not found');

    } catch (err: any) {
      setError(err.message || 'Failed to initiate injection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contracts.usd, refreshStats]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet({
          address: null,
          chainId: null,
          isConnected: false,
          isCorrectNetwork: false
        });
        setContracts({
          usd: null,
          locksTreasury: null,
          lusdMinting: null,
          priceOracle: null,
          kycRegistry: null
        });
      } else {
        setWallet(prev => ({ ...prev, address: accounts[0] }));
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      const isCorrectNetwork = chainId === CURRENT_NETWORK.chainId;
      setWallet(prev => ({ ...prev, chainId, isCorrectNetwork }));
      
      if (isCorrectNetwork) {
        initializeContracts();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [initializeContracts]);

  return {
    wallet,
    connectWallet,
    switchNetwork,
    contracts,
    stats,
    refreshStats,
    createCustodyAccount,
    depositToCustody,
    initiateInjection,
    isLoading,
    error,
    txHash
  };
}

// Export types
export type { ContractStats, CustodyAccount, WalletState, DCBContractsHook };
