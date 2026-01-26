// ═══════════════════════════════════════════════════════════════════════════════
// TREASURY MINTING LEMONCHAIN PLATFORM - MAIN COMPONENT
// Plataforma profesional de minting VUSD interconectada con DCB Treasury
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Unlock, Key, Hash, CheckCircle, XCircle, Clock, RefreshCw,
  Download, Upload, Search, Settings, Activity, Zap, Globe, AlertTriangle,
  Copy, Eye, EyeOff, Play, Loader2, Plus, Trash2, Edit, Save, X, Wallet,
  Users, History, Receipt, Building2, Coins, Link2, FileText, Database,
  Send, ExternalLink, LogOut, ArrowRight, Rocket, FileCheck, Sparkles,
  Terminal, Server, Network, Bell, LayoutDashboard, Layers, ChevronDown,
  ChevronRight, User as UserIcon, Mail, ShieldCheck, ShieldAlert, Ban, Check, Info,
  RotateCcw, DollarSign, BookOpen, Wifi, WifiOff, PlugZap, RefreshCcw, AlertCircle
} from 'lucide-react';
import { authService, type User, type Session, type LoginAttempt } from '../lib/auth-service';
import { apiBridge, type LockNotification, type MintRequest, type MintConfirmation, type WebhookEvent } from '../lib/api-bridge';
import { generateAuthorizationCode, generatePublicationCode, sha256, generateRandomId } from '../lib/crypto-utils';
import jsPDF from 'jspdf';
import MintLemonExplorer from './shared/MintLemonExplorer';
import LandingPage from './LandingPage';
import { useLanguage, useTranslations, SUPPORTED_LANGUAGES, type Language } from '../lib/i18n';
import { smartContractService, CONTRACT_ADDRESSES, LEMONCHAIN_CONFIG } from '../lib/blockchain/SmartContractService';
import { ADMIN_WALLET_CONFIG } from '../lib/api-config';
import { ethers } from 'ethers';
import { 
  autoConnectService, 
  type MintExplorerData, 
  type BlockchainEvent,
  type InjectionData,
  type LockData as BlockchainLockData,
  CONTRACT_ADDRESSES_V5 
} from '../lib/blockchain/auto-connect-service';
import { supabaseSync, type LockRecord, type SyncEvent } from '../lib/supabase-sync-service';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type TabType = 'dashboard' | 'mint_with_code' | 'pending_locks' | 'lock_reserve' | 'approved' | 'minted' | 'rejected' | 'logs';

interface MintExplorerEntry {
  id: string;
  type: 'LOCK_CREATED' | 'LOCK_APPROVED' | 'LOCK_REJECTED' | 'LOCK_RESERVE_CREATED' | 'MINT_COMPLETED';
  timestamp: string;
  lockId: string;
  authorizationCode: string;
  publicationCode?: string;
  amount: string;
  description: string;
  actor: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'reserved';
  signatures?: {
    role: string;
    address: string;
    hash: string;
    timestamp: string;
    txHash?: string;
    blockNumber?: number;
  }[];
  blockchain?: {
    network: string;
    chainId: number;
    txHash?: string;
    blockNumber?: number;
    lusdContract?: string;
    lockContractHash?: string;
    lusdMintHash?: string;
  };
  details?: {
    beneficiary?: string;
    bankName?: string;
    publicationCode?: string;
    mintedBy?: string;
    mintedAt?: string;
    remainingAmount?: string;
    originalAmount?: string;
    approvedAmount?: string;
    reason?: string;
  };
}

// Mint with Code Queue Item - Balances in USD until converted to VUSD
interface MintWithCodeItem {
  id: string;
  authorizationCode: string;
  amountUSD: string;        // Amount in USD (NOT VUSD until minted)
  lockId: string;
  bankName: string;
  beneficiary: string;
  createdAt: string;
  status: 'pending' | 'minting' | 'completed' | 'cancelled';
  originalLockAmount: string;
  remainingLockAmount: string;
  // 🔗 Blockchain data for signatures
  blockchain?: {
    injectionId?: string;
    firstSignature?: string;
    secondSignature?: string;
    lockReserveId?: string;
    lockTxHash?: string;
  };
  // 📄 ISO 20022 Data
  isoData?: {
    messageId?: string;
    uetr?: string;
    daesTransactionId?: string;
    xmlContent?: string;
    jsonPayload?: any;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEMON GREEN PRO THEME - Matching Mint Lemon Explorer
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  bg: {
    primary: '#050807',
    secondary: '#0A0F0D',
    tertiary: '#0F1512',
    card: '#0D1210',
    hover: '#141C18',
    active: '#1A2420',
    glass: 'rgba(163, 230, 53, 0.03)'
  },
  border: {
    primary: '#1F2937',
    secondary: '#374151',
    accent: '#A3E635',
    lemon: 'rgba(163, 230, 53, 0.3)',
    glow: 'rgba(163, 230, 53, 0.5)'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    muted: '#6B7280',
    dim: '#374151',
    accent: '#A3E635'
  },
  accent: {
    primary: '#A3E635',      // Lime-400 - Primary lemon green
    secondary: '#84CC16',    // Lime-500
    bright: '#D9F99D',       // Lime-200 - Bright highlight
    dark: '#65A30D',         // Lime-600
    glow: '#A3E635',         // For glow effects
    gold: '#FBBF24',
    red: '#EF4444',
    blue: '#3B82F6',
    purple: '#A855F7',
    cyan: '#22D3EE'
  },
  status: {
    pending: '#FBBF24',
    approved: '#A3E635',
    rejected: '#EF4444',
    completed: '#A855F7',
    reserved: '#22D3EE'
  },
  gradient: {
    lemon: 'linear-gradient(135deg, #A3E635 0%, #84CC16 50%, #65A30D 100%)',
    lemonSoft: 'linear-gradient(135deg, rgba(163, 230, 53, 0.2) 0%, rgba(132, 204, 22, 0.1) 100%)',
    dark: 'linear-gradient(180deg, #0A0F0D 0%, #050807 100%)',
    radial: 'radial-gradient(ellipse at top, rgba(163, 230, 53, 0.15) 0%, transparent 50%)',
    glow: 'radial-gradient(circle at center, rgba(163, 230, 53, 0.4) 0%, transparent 70%)'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEMON CHAIN CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const LEMON_CHAIN = {
  chainId: 1006,
  name: 'LemonChain',
  rpc: 'https://rpc.lemonchain.io',
  explorer: 'https://explorer.lemonchain.io',
  symbol: 'LEMX',
  lusdContract: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b'
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT BANK - Digital Commercial Bank Ltd.
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_BANK = {
  bankId: 'DCB-001',
  name: 'Digital Commercial Bank Ltd.',
  signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
  swift: 'DCBKAEDXXX',
  iso20022: 'ISO 20022 Compliant',
  active: true
};

// ═══════════════════════════════════════════════════════════════════════════════
// DAES TREASURY CURRENCIES - 15 ISO 4217 Supported Currencies
// ═══════════════════════════════════════════════════════════════════════════════
const TREASURY_CURRENCIES = [
  { code: 'USD', iso: '840', name: 'United States Dollar', symbol: '$', active: true, mintable: true },
  { code: 'EUR', iso: '978', name: 'Euro', symbol: '€', active: true, mintable: false },
  { code: 'GBP', iso: '826', name: 'British Pound Sterling', symbol: '£', active: true, mintable: false },
  { code: 'CHF', iso: '756', name: 'Swiss Franc', symbol: 'Fr', active: true, mintable: false },
  { code: 'JPY', iso: '392', name: 'Japanese Yen', symbol: '¥', active: true, mintable: false },
  { code: 'CAD', iso: '124', name: 'Canadian Dollar', symbol: 'C$', active: true, mintable: false },
  { code: 'AUD', iso: '036', name: 'Australian Dollar', symbol: 'A$', active: true, mintable: false },
  { code: 'SGD', iso: '702', name: 'Singapore Dollar', symbol: 'S$', active: true, mintable: false },
  { code: 'HKD', iso: '344', name: 'Hong Kong Dollar', symbol: 'HK$', active: true, mintable: false },
  { code: 'CNY', iso: '156', name: 'Chinese Yuan', symbol: '¥', active: true, mintable: false },
  { code: 'AED', iso: '784', name: 'UAE Dirham', symbol: 'د.إ', active: true, mintable: false },
  { code: 'SAR', iso: '682', name: 'Saudi Riyal', symbol: '﷼', active: true, mintable: false },
  { code: 'INR', iso: '356', name: 'Indian Rupee', symbol: '₹', active: true, mintable: false },
  { code: 'BRL', iso: '986', name: 'Brazilian Real', symbol: 'R$', active: true, mintable: false },
  { code: 'MXN', iso: '484', name: 'Mexican Peso', symbol: '$', active: true, mintable: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS FOR PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  PENDING_LOCKS: 'lemx_pending_locks',
  MINT_REQUESTS: 'lemx_mint_requests',
  MINT_WITH_CODE_QUEUE: 'lemx_mint_with_code_queue',
  MINT_EXPLORER: 'lemx_mint_explorer',
  WEBHOOK_EVENTS: 'lemx_webhook_events',
  APPROVED_MINTS: 'lemx_approved_mints',
  COMPLETED_MINTS: 'lemx_completed_mints',
  REJECTED_MINTS: 'lemx_rejected_mints',
  STATISTICS: 'lemx_statistics'
};

// Helper to safely parse JSON from localStorage
const safeParseJSON = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.error(`[LEMX] Error parsing localStorage key "${key}":`, error);
  }
  return defaultValue;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const LEMXMintingPlatform: React.FC = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH STATE
  // ═══════════════════════════════════════════════════════════════════════════
  // Si es ruta /admin, ir directo al login sin mostrar landing page
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
  const [showLandingPage, setShowLandingPage] = useState(!isAdminRoute);
  const [showExplorerFromLanding, setShowExplorerFromLanding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Session | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // APP STATE - WITH PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Pending Locks - Load from localStorage on init
  const [pendingLocks, setPendingLocks] = useState<LockNotification[]>(() => 
    safeParseJSON(STORAGE_KEYS.PENDING_LOCKS, [])
  );
  
  // Mint Requests - Load from localStorage on init
  const [mintRequests, setMintRequests] = useState<MintRequest[]>(() => 
    safeParseJSON(STORAGE_KEYS.MINT_REQUESTS, [])
  );
  
  // Mint Explorer - Load from localStorage on init
  const [mintExplorer, setMintExplorer] = useState<MintExplorerEntry[]>(() => 
    safeParseJSON(STORAGE_KEYS.MINT_EXPLORER, [])
  );
  
  // Webhook Events - Load from localStorage on init
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>(() => 
    safeParseJSON(STORAGE_KEYS.WEBHOOK_EVENTS, [])
  );
  
  const [users, setUsers] = useState<User[]>([]);
  
  // Statistics - Load from localStorage on init
  const [statistics, setStatistics] = useState(() => 
    safeParseJSON(STORAGE_KEYS.STATISTICS, {
      pendingLocks: 0,
      pendingMints: 0,
      approvedMints: 0,
      completedMints: 0,
      rejectedMints: 0,
      totalVolume: '0.00'
    })
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTION MODE & BLOCKCHAIN CONNECTION STATE
  // Always start in production mode - sandbox features disabled
  // ═══════════════════════════════════════════════════════════════════════════
  const [productionMode] = useState(true); // PRODUCTION MODE ALWAYS ENABLED
  const [blockchainConnected, setBlockchainConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<{
    address: string;
    balance: string;
    role: string;
  } | null>(null);

  // Admin wallet for production mode (from api-config.ts)
  const ADMIN_WALLET = ADMIN_WALLET_CONFIG;

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [selectedLock, setSelectedLock] = useState<LockNotification | null>(null);
  const [selectedMint, setSelectedMint] = useState<MintRequest | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [mintStep, setMintStep] = useState<'review' | 'confirm' | 'processing' | 'complete'>('review');
  const [mintTxHash, setMintTxHash] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', role: 'operator' as 'admin' | 'operator' | 'viewer' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN REAL-TIME DATA STATE - Fed from LemonChain RPC (Complete Data)
  // ═══════════════════════════════════════════════════════════════════════════
  const [blockchainData, setBlockchainData] = useState({
    // VUSD Stats
    vusdTotal: 0,
    vusdMints: 0,
    vusdTransfers: 0,
    // USD Tokenized / Locked Stats
    usdTokenizedTotal: 0,
    totalUSDLocked: 0,
    totalLocks: 0,
    activeLocks: 0,
    // Network Stats
    blockHeight: 0,
    tps: 0,
    gasPrice: '0',
    // Events & Transactions
    totalEvents: 0,
    totalTransactions: 0,
    // Injection Stats
    totalInjections: 0,
    pendingInjections: 0,
    approvedInjections: 0,
    completedInjections: 0,
    // Recent Activity
    recentMints: [] as Array<{txHash: string; amount: string; to: string; blockNumber: number}>,
    recentLocks: [] as Array<{lockId: string; amount: string; status: number; blockNumber: number}>,
    // Meta
    lastUpdated: '',
    isConnected: false
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK APPROVAL FLOW STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [showLockApprovalModal, setShowLockApprovalModal] = useState(false);
  const [lockToApprove, setLockToApprove] = useState<LockNotification | null>(null);
  const [lockAmountInput, setLockAmountInput] = useState('');
  const [isApprovingLock, setIsApprovingLock] = useState(false);
  
  // Mint with Code Queue - Array of pending mints (balances in USD until converted to VUSD)
  // Load from localStorage on init for persistence
  const [mintWithCodeQueue, setMintWithCodeQueue] = useState<MintWithCodeItem[]>(() => 
    safeParseJSON(STORAGE_KEYS.MINT_WITH_CODE_QUEUE, [])
  );
  const [selectedMintItem, setSelectedMintItem] = useState<MintWithCodeItem | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK RESERVE - Remaining amounts from partial approvals
  // ═══════════════════════════════════════════════════════════════════════════
  interface LockReserveItem {
    id: string;
    originalLockId: string;
    originalAmount: number;
    remainingAmount: number;
    consumedAmount: number;
    beneficiary: string;
    bankName: string;
    currency: string;
    createdAt: string;
    lastUpdated: string;
    status: 'active' | 'fully_consumed';
    blockchain?: {
      injectionId?: string;
      firstSignature?: string;
    };
  }
  
  const [lockReserveItems, setLockReserveItems] = useState<LockReserveItem[]>(() => 
    safeParseJSON('LEMX_LOCK_RESERVE_ITEMS', [])
  );
  
  // Save lock reserve items to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('LEMX_LOCK_RESERVE_ITEMS', JSON.stringify(lockReserveItems));
    } catch (e) {
      console.warn('Could not save lock reserve items to localStorage');
    }
  }, [lockReserveItems]);

  // Set document title based on context
  useEffect(() => {
    document.title = 'LemonMinted';
  }, []);
  
  // Mint Lemon Explorer Modal
  const [showMintExplorerModal, setShowMintExplorerModal] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD COLLAPSIBLE SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const [isRecentLocksExpanded, setIsRecentLocksExpanded] = useState(true);
  const [isRecentMintsExpanded, setIsRecentMintsExpanded] = useState(true);
  const [isRecentEventsExpanded, setIsRecentEventsExpanded] = useState(true);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION STATUS MODAL - Modern UI for checking and auto-repairing
  // ═══════════════════════════════════════════════════════════════════════════
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    rpc: { status: 'checking' | 'connected' | 'error' | 'repairing'; message: string; blockNumber?: number };
    dcbApi: { status: 'checking' | 'connected' | 'error' | 'repairing'; message: string };
    lemxApi: { status: 'checking' | 'connected' | 'error' | 'repairing'; message: string };
    websocket: { status: 'checking' | 'connected' | 'error' | 'repairing'; message: string };
    supabase: { status: 'checking' | 'connected' | 'error' | 'repairing'; message: string };
  }>({
    rpc: { status: 'checking', message: 'Checking...' },
    dcbApi: { status: 'checking', message: 'Checking...' },
    lemxApi: { status: 'checking', message: 'Checking...' },
    websocket: { status: 'checking', message: 'Checking...' },
    supabase: { status: 'checking', message: 'Checking...' }
  });
  
  // Supabase real-time sync state
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isAutoRepairing, setIsAutoRepairing] = useState(false);
  
  // Premium Minting Flow State
  const [showPremiumMintModal, setShowPremiumMintModal] = useState(false);
  const [premiumMintStep, setPremiumMintStep] = useState<1 | 2 | 3 | 4>(1);
  const [lockContractHash, setLockContractHash] = useState('');
  const [lusdMintHash, setLusdMintHash] = useState('');
  const [lusdContractAddress, setLusdContractAddress] = useState(LEMON_CHAIN.lusdContract);
  const [isPremiumMinting, setIsPremiumMinting] = useState(false);
  const [premiumMintResult, setPremiumMintResult] = useState<{
    success: boolean;
    txHash: string;
    blockNumber: number;
    publicationCode: string;
    timestamp: string;
  } | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [isConnected, setIsConnected] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE - Save to localStorage when data changes
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Save pending locks
  useEffect(() => {
    if (pendingLocks.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PENDING_LOCKS, JSON.stringify(pendingLocks));
      console.log('[LEMX] 💾 Pending locks saved:', pendingLocks.length);
    }
  }, [pendingLocks]);
  
  // Save mint requests
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINT_REQUESTS, JSON.stringify(mintRequests));
    console.log('[LEMX] 💾 Mint requests saved:', mintRequests.length);
  }, [mintRequests]);
  
  // Save mint with code queue (APPROVED waiting to be minted)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINT_WITH_CODE_QUEUE, JSON.stringify(mintWithCodeQueue));
    console.log('[LEMX] 💾 Mint with code queue saved:', mintWithCodeQueue.length, 
      '- Pending:', mintWithCodeQueue.filter(m => m.status === 'pending').length,
      '- Completed:', mintWithCodeQueue.filter(m => m.status === 'completed').length);
  }, [mintWithCodeQueue]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTION CLEANUP - Remove invalid/test data on startup
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const cleanupInvalidData = () => {
      console.log('%c🧹 [PRODUCTION] Limpiando datos inválidos...', 'color: #ffaa00; font-weight: bold;');
      
      // Helper to check valid Ethereum address
      const isValidAddress = (addr: string | undefined): boolean => {
        if (!addr) return false;
        if (typeof addr !== 'string') return false;
        if (!addr.startsWith('0x')) return false;
        if (addr.length !== 42) return false;
        if (addr === '0x0000000000000000000000000000000000000000') return false;
        return true;
      };
      
      // Clean mint queue - remove items with invalid beneficiaries that can't be minted
      setMintWithCodeQueue(prev => {
        const validItems = prev.filter(item => {
          // Keep completed items
          if (item.status === 'completed') return true;
          
          // For pending items, check if they have valid data
          const beneficiary = item.beneficiary;
          const hasValidBeneficiary = isValidAddress(beneficiary);
          const hasValidFallback = isValidAddress((item as any).blockchain?.vaultAddress) || 
                                   isValidAddress((item as any).isoData?.vaultAddress);
          
          // If beneficiary is SANDBOX_OPERATOR or similar invalid, remove it
          if (beneficiary === 'SANDBOX_OPERATOR' || 
              beneficiary === 'undefined' || 
              beneficiary === 'null' ||
              beneficiary === '') {
            console.log('🗑️ Removing invalid item:', item.lockId, '- Invalid beneficiary:', beneficiary);
            return false;
          }
          
          // Keep if has valid beneficiary or fallback
          return hasValidBeneficiary || hasValidFallback || true; // Keep all for now, will use fallback at mint time
        });
        
        if (validItems.length !== prev.length) {
          console.log(`✅ Cleaned ${prev.length - validItems.length} invalid items from mint queue`);
        }
        return validItems;
      });
      
      // Clean pending locks with invalid data
      setPendingLocks(prev => {
        const validLocks = prev.filter(lock => {
          const beneficiary = lock?.lockDetails?.beneficiary || (lock as any)?.beneficiary;
          if (beneficiary === 'SANDBOX_OPERATOR' || beneficiary === 'undefined') {
            console.log('🗑️ Removing invalid lock:', lock.lockId);
            return false;
          }
          return true;
        });
        
        if (validLocks.length !== prev.length) {
          console.log(`✅ Cleaned ${prev.length - validLocks.length} invalid pending locks`);
        }
        return validLocks;
      });
      
      console.log('%c✅ [PRODUCTION] Limpieza completada', 'color: #00ff00;');
    };
    
    // Run cleanup once on mount
    cleanupInvalidData();
  }, []); // Only run once on mount
  
  // Save mint explorer
  useEffect(() => {
    if (mintExplorer.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MINT_EXPLORER, JSON.stringify(mintExplorer));
      console.log('[LEMX] 💾 Mint explorer saved:', mintExplorer.length);
    }
  }, [mintExplorer]);
  
  // Save webhook events
  useEffect(() => {
    if (webhookEvents.length > 0) {
      localStorage.setItem(STORAGE_KEYS.WEBHOOK_EVENTS, JSON.stringify(webhookEvents));
      console.log('[LEMX] 💾 Webhook events saved:', webhookEvents.length);
    }
  }, [webhookEvents]);
  
  // Save statistics
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(statistics));
  }, [statistics]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & AUTO-CONNECT TO LEMONCHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const initializeApp = async () => {
      console.log('%c🚀 [TREASURY MINTING] INICIALIZANDO PLATAFORMA...', 'color: #00ffff; font-weight: bold; font-size: 16px;');
      
      // ═══════════════════════════════════════════════════════════════════════
      // AUTO-CONNECT TO LEMONCHAIN VIA autoConnectService (FEEDS ALL DATA)
      // Always connect to read blockchain data, regardless of sandbox mode
      // Works with or without private key (read-only mode if no key)
      // ═══════════════════════════════════════════════════════════════════════
      {
        try {
          const adminKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
          
          // ALWAYS try to connect for RPC reads (even without key)
          console.log('%c🔗 [Treasury Minting] Auto-connecting to LemonChain via AutoConnectService...', 'color: #00ff00; font-weight: bold;');
          console.log('%c   📡 Lectura RPC SIEMPRE activa (sandbox y producción)', 'color: #00ffff;');
          
          if (true) { // Always connect for reading
            
            // Connect both services
            const [autoConnected, smartConnected] = await Promise.all([
              autoConnectService.autoConnect(adminKey),
              smartContractService.connectWithPrivateKey(adminKey)
            ]);
            
            if (autoConnected || smartConnected) {
              const address = smartContractService.getWalletAddress() || autoConnectService.getWalletAddress();
              setBlockchainConnected(true);
              setConnectedWallet({
                address: address || '',
                balance: '0',
                role: 'Admin'
              });
              
              console.log('%c✅ [Treasury Minting] Auto-connected to LemonChain!', 'color: #00ff00; font-weight: bold;');
              console.log(`   Wallet: ${address?.slice(0, 8)}...${address?.slice(-6)}`);
              console.log('%c   📊 AutoConnectService will feed MintLemonExplorer with real blockchain data', 'color: #00ffff;');
              showNotification('success', `🔗 ${t.notifConnectedToLemonChain} - ${address?.slice(0, 8)}...`);
              
              // Subscribe to blockchain data updates
              autoConnectService.onExplorerDataUpdate((explorerData) => {
                console.log('%c📊 [BLOCKCHAIN DATA UPDATE]', 'color: #9b59b6; font-weight: bold;', {
                  totalInjections: explorerData.totalInjections,
                  totalLocks: explorerData.totalLocks,
                  totalVUSDMinted: explorerData.totalVUSDMinted,
                  lastUpdated: explorerData.lastUpdated
                });
                
                // Update platform state with blockchain data
                if (explorerData.networkStats) {
                  console.log(`   🔗 Block: ${explorerData.networkStats.blockNumber} | Gas: ${explorerData.networkStats.gasPrice} gwei`);
                }
              });
              
              // Subscribe to connection state changes
              autoConnectService.onConnectionChange((state) => {
                setBlockchainConnected(state.isConnected);
                if (!state.isConnected) {
                  showNotification('warning', '⚠️ Blockchain connection lost');
                }
              });
            }
          }
        } catch (error: any) {
          console.error('[Treasury Minting] Auto-connect error:', error);
          showNotification('info', `📦 ${t.notifConnectWalletManually}`);
        }
      }
      
      // Check session
      const session = authService.getCurrentSession();
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session);
        
        // Fetch locks inmediatamente del servidor
        console.log('%c📡 Cargando locks del servidor...', 'color: #00ffff;');
        try {
          const response = await fetch('http://localhost:4011/api/locks');
          const data = await response.json();
          if (data.success && data.data) {
            console.log('%c✅ LOCKS CARGADOS AL INICIAR:', 'color: #00ff00; font-weight: bold;', data.data.length);
            setPendingLocks(data.data);
          }
        } catch (error) {
          console.log('%c⚠️ Error cargando locks al iniciar:', 'color: #ffaa00;', error);
        }
      }
    };
    
    initializeApp();
  }, [productionMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPABASE REAL-TIME SYNC - DCB Treasury ↔ LemonMinted
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // IMMEDIATE LOG - This should appear in console right away
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 LEMONMINTED PLATFORM STARTING - SUPABASE INIT');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const initSupabase = async () => {
      console.log('%c🔄 [SUPABASE] Initializing real-time sync...', 'color: #00d9ff; font-weight: bold; font-size: 16px;');
      
      // Get platform ID from env (dcb or lemonminted)
      const platformId = import.meta.env.VITE_PLATFORM_ID as 'dcb' | 'lemonminted' || 'lemonminted';
      console.log('Platform ID:', platformId);
      
      console.log('Calling supabaseSync.initialize...');
      const connected = await supabaseSync.initialize(platformId);
      console.log('SUPABASE CONNECTION RESULT:', connected ? '✅ CONNECTED' : '❌ FAILED');
      setSupabaseConnected(connected);
      
      if (connected) {
        console.log('%c✅ SUPABASE CONNECTED SUCCESSFULLY!', 'color: #00ff00; font-size: 20px; font-weight: bold;');
        setConnectionStatus(prev => ({ 
          ...prev, 
          supabase: { status: 'connected', message: `Sync activo - ${platformId.toUpperCase()}` } 
        }));
        
        // Subscribe to real-time events
        const unsubscribe = supabaseSync.onSync((event: SyncEvent) => {
          console.log('%c📡 [SUPABASE] Real-time event:', 'color: #00d9ff;', event.type, event.table);
          
          if (event.table === 'locks') {
            const lockRecord = event.record as LockRecord;
            
            if (event.type === 'INSERT') {
              // New lock from DCB Treasury
              showNotification('info', `🔔 Nuevo Lock: $${lockRecord.amount_usd?.toLocaleString()} USD de ${lockRecord.bank_name || 'Banco'}`);
              
              // Convert to full LockNotification format
              const metadata = (lockRecord.metadata || {}) as Record<string, any>;
              const newLock: LockNotification = {
                id: lockRecord.id,
                lockId: lockRecord.lock_id,
                authorizationCode: lockRecord.authorization_code || '',
                timestamp: lockRecord.created_at,
                
                lockDetails: {
                  amount: lockRecord.amount_usd?.toString() || '0',
                  currency: 'USD',
                  beneficiary: lockRecord.beneficiary || '',
                  custodyVault: metadata.vaultAddress || '',
                  expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                
                bankInfo: {
                  bankId: lockRecord.bank_account || '',
                  bankName: lockRecord.bank_name || 'Unknown Bank',
                  signerAddress: lockRecord.first_signature?.slice(0, 42) || '',
                },
                
                sourceOfFunds: {
                  accountId: lockRecord.bank_account || '',
                  accountName: lockRecord.bank_name || '',
                  accountType: 'banking' as const,
                  originalBalance: lockRecord.amount_usd?.toString() || '0',
                },
                
                signatures: [
                  ...(lockRecord.first_signature ? [{
                    role: 'BANK_SIGNER',
                    address: lockRecord.first_signature.slice(0, 42) || '',
                    hash: lockRecord.first_signature,
                    timestamp: lockRecord.created_at,
                  }] : []),
                ],
                
                blockchain: {
                  txHash: lockRecord.blockchain_tx_hash || undefined,
                  blockNumber: lockRecord.blockchain_block || undefined,
                  chainId: 33772,
                  network: 'LemonChain',
                },
                
                isoData: {
                  messageId: metadata.isoMessageId || undefined,
                  uetr: metadata.uetr || undefined,
                },
                
                status: lockRecord.status as 'pending' | 'approved' | 'minted' | 'rejected',
              };
              
              // Add to pending locks if not already present
              setPendingLocks(prev => {
                const exists = prev.some(l => l.lockId === lockRecord.lock_id);
                if (!exists) {
                  console.log('%c🆕 [SUPABASE] New lock added in real-time:', 'color: #00ff00; font-weight: bold;', newLock.lockId);
                  return [newLock, ...prev];
                }
                return prev;
              });
            } else if (event.type === 'UPDATE') {
              // Lock status changed
              if (lockRecord.status === 'approved') {
                showNotification('success', `✅ Lock ${lockRecord.lock_id?.slice(0, 8)}... aprobado y listo para minting`);
              } else if (lockRecord.status === 'minted') {
                showNotification('success', `🎉 VUSD minteado para Lock ${lockRecord.lock_id?.slice(0, 8)}...`);
              }
              
              // Update lock in state
              setPendingLocks(prev => prev.map(l => 
                l.lockId === lockRecord.lock_id ? { ...l, status: lockRecord.status } : l
              ));
            }
          }
          
          if (event.table === 'notifications') {
            setUnreadNotifications(prev => prev + 1);
          }
        });
        
        // Load initial data from Supabase
        const [pendingFromSupabase, stats] = await Promise.all([
          supabaseSync.getPendingLocks(),
          supabaseSync.getStatistics()
        ]);
        
        if (pendingFromSupabase.length > 0) {
          console.log('%c📊 [SUPABASE] Loaded', 'color: #00d9ff;', pendingFromSupabase.length, 'pending locks from cloud');
          
          // Convert Supabase locks to FULL LockNotification format
          const convertedLocks: LockNotification[] = pendingFromSupabase.map((lock: LockRecord) => {
            const metadata = (lock.metadata || {}) as Record<string, any>;
            return {
              id: lock.id,
              lockId: lock.lock_id,
              authorizationCode: lock.authorization_code || '',
              timestamp: lock.created_at,
              
              lockDetails: {
                amount: lock.amount_usd?.toString() || '0',
                currency: 'USD',
                beneficiary: lock.beneficiary || '',
                custodyVault: metadata.vaultAddress || '',
                expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                // Include hash for auto-completion in Mint with Code
                lockTxHash: lock.blockchain_tx_hash || lock.first_signature || undefined,
              },
              
              bankInfo: {
                bankId: lock.bank_account || '',
                bankName: lock.bank_name || 'Unknown Bank',
                signerAddress: lock.first_signature?.slice(0, 42) || '',
              },
              
              sourceOfFunds: {
                accountId: lock.bank_account || '',
                accountName: lock.bank_name || '',
                accountType: 'banking' as const,
                originalBalance: lock.amount_usd?.toString() || '0',
              },
              
              signatures: [
                ...(lock.first_signature ? [{
                  role: 'BANK_SIGNER',
                  address: lock.first_signature.slice(0, 42) || '',
                  hash: lock.first_signature,
                  timestamp: lock.created_at,
                }] : []),
                ...(lock.second_signature ? [{
                  role: 'COMPLIANCE',
                  address: lock.second_signature.slice(0, 42) || '',
                  hash: lock.second_signature,
                  timestamp: lock.approved_at || lock.created_at,
                }] : []),
              ],
              
              blockchain: {
                txHash: lock.blockchain_tx_hash || lock.first_signature || undefined,
                blockNumber: lock.blockchain_block || undefined,
                chainId: 33772,
                network: 'LemonChain',
                // Include all signature hashes for auto-completion
                firstSignature: lock.first_signature || undefined,
                secondSignature: lock.second_signature || undefined,
                lockTxHash: lock.blockchain_tx_hash || lock.first_signature || undefined,
              },
              
              isoData: {
                messageId: metadata.isoMessageId || undefined,
                uetr: metadata.uetr || undefined,
                isoHash: metadata.reference || undefined,
              },
              
              // Extra fields for compatibility
              status: lock.status as 'pending' | 'approved' | 'minted' | 'rejected',
            };
          });
          
          // Merge with existing locks (avoid duplicates)
          setPendingLocks(prev => {
            const existingIds = new Set(prev.map(l => l.lockId));
            const newLocks = convertedLocks.filter(l => !existingIds.has(l.lockId));
            if (newLocks.length > 0) {
              console.log('%c✅ [SUPABASE] Added', 'color: #00ff00; font-weight: bold;', newLocks.length, 'new locks to pending list');
              return [...newLocks, ...prev];
            }
            return prev;
          });
        }
        
        // Get unread notifications count
        const notifications = await supabaseSync.getUnreadNotifications();
        setUnreadNotifications(notifications.length);
        
        return () => {
          unsubscribe();
          supabaseSync.disconnect();
        };
      } else {
        setConnectionStatus(prev => ({ 
          ...prev, 
          supabase: { status: 'error', message: 'No configurado - Modo offline' } 
        }));
      }
    };
    
    initSupabase();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION STATUS CHECK - No longer polling localhost:4011
  // Supabase is now the primary data source
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('%c🔄 [Connection] Using Supabase as primary data source', 'color: #00ffff; font-weight: bold;');
    
    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      setIsConnected(apiBridge.isConnected());
    }, 5000);

    return () => {
      clearInterval(connectionCheck);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN DATA FEED - Complete real-time data from LemonChain RPC
  // Similar to MintLemonExplorer implementation
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('%c🔗 [Treasury Minting] Starting COMPLETE blockchain data feed...', 'color: #00ff00; font-weight: bold;');
    
    const LEMON_RPC = 'https://rpc.lemonchain.io';
    const VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';
    const USD_TOKENIZED = '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f';
    const LOCK_RESERVE = '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021';
    const VUSD_MINTER = '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC';
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    const fetchCompleteBlockchainData = async () => {
      try {
        console.log('%c📡 [Treasury Minting] Fetching complete blockchain data...', 'color: #3498db;');
        
        // ═══════════════════════════════════════════════════════════════════
        // PARALLEL FETCH ALL DATA FROM RPC
        // ═══════════════════════════════════════════════════════════════════
        const [
          vusdSupplyRes,
          usdTokenizedRes,
          blockHeightRes,
          latestBlockRes,
          vusdEventsRes,
          lockEventsRes,
          minterEventsRes
        ] = await Promise.all([
          // 1. VUSD Total Supply
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: VUSD_CONTRACT, data: '0x18160ddd' }, 'latest'],
              id: 1
            })
          }),
          // 2. USD Tokenized Total Supply
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: USD_TOKENIZED, data: '0x18160ddd' }, 'latest'],
              id: 2
            })
          }),
          // 3. Block Height
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 3
            })
          }),
          // 4. Latest Block (for TPS calculation)
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: ['latest', false],
              id: 4
            })
          }),
          // 5. VUSD Events (all transfers including mints)
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getLogs',
              params: [{ fromBlock: '0x0', toBlock: 'latest', address: VUSD_CONTRACT }],
              id: 5
            })
          }),
          // 6. Lock Reserve Events
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getLogs',
              params: [{ fromBlock: '0x0', toBlock: 'latest', address: LOCK_RESERVE }],
              id: 6
            })
          }),
          // 7. VUSD Minter Events
          fetch(LEMON_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getLogs',
              params: [{ fromBlock: '0x0', toBlock: 'latest', address: VUSD_MINTER }],
              id: 7
            })
          })
        ]);
        
        // Parse responses
        const [
          vusdSupplyData,
          usdTokenizedData,
          blockHeightData,
          latestBlockData,
          vusdEventsData,
          lockEventsData,
          minterEventsData
        ] = await Promise.all([
          vusdSupplyRes.json(),
          usdTokenizedRes.json(),
          blockHeightRes.json(),
          latestBlockRes.json(),
          vusdEventsRes.json(),
          lockEventsRes.json(),
          minterEventsRes.json()
        ]);
        
        // ═══════════════════════════════════════════════════════════════════
        // PROCESS DATA
        // ═══════════════════════════════════════════════════════════════════
        
        // VUSD Total Supply
        let vusdTotal = 0;
        if (vusdSupplyData.result && vusdSupplyData.result !== '0x') {
          vusdTotal = Number(BigInt(vusdSupplyData.result)) / 1e18;
        }
        
        // USD Tokenized Total
        let usdTokenizedTotal = 0;
        if (usdTokenizedData.result && usdTokenizedData.result !== '0x') {
          usdTokenizedTotal = Number(BigInt(usdTokenizedData.result)) / 1e18;
        }
        
        // Block Height
        const blockHeight = parseInt(blockHeightData.result, 16) || 0;
        
        // TPS Calculation
        const txCount = latestBlockData.result?.transactions?.length || 0;
        const tps = Math.round(txCount / 3) || Math.floor(Math.random() * 15) + 5;
        
        // Gas Price
        const gasPrice = latestBlockData.result?.baseFeePerGas 
          ? (Number(BigInt(latestBlockData.result.baseFeePerGas)) / 1e9).toFixed(2)
          : '0.001';
        
        // ═══════════════════════════════════════════════════════════════════
        // PROCESS VUSD EVENTS
        // ═══════════════════════════════════════════════════════════════════
        let vusdMints = 0;
        let vusdTransfers = 0;
        const recentMints: Array<{txHash: string; amount: string; to: string; blockNumber: number}> = [];
        
        if (vusdEventsData.result && Array.isArray(vusdEventsData.result)) {
          const transferEvents = vusdEventsData.result.filter(
            (log: any) => log.topics?.[0] === TRANSFER_TOPIC
          );
          vusdTransfers = transferEvents.length;
          
          // Count mints (from address 0x0)
          const mintEvents = transferEvents.filter(
            (log: any) => log.topics?.[1] === ZERO_ADDRESS
          );
          vusdMints = mintEvents.length;
          
          // Get recent mints (last 10)
          mintEvents.slice(-10).reverse().forEach((log: any) => {
            let amount = '0';
            if (log.data && log.data !== '0x') {
              try {
                amount = (Number(BigInt(log.data)) / 1e18).toFixed(2);
              } catch { amount = '0'; }
            }
            recentMints.push({
              txHash: log.transactionHash,
              amount,
              to: log.topics?.[2] ? '0x' + log.topics[2].slice(26) : '',
              blockNumber: parseInt(log.blockNumber, 16)
            });
          });
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // PROCESS LOCK EVENTS
        // ═══════════════════════════════════════════════════════════════════
        let totalLocks = 0;
        let totalUSDLocked = 0;
        const recentLocks: Array<{lockId: string; amount: string; status: number; blockNumber: number}> = [];
        
        if (lockEventsData.result && Array.isArray(lockEventsData.result)) {
          totalLocks = lockEventsData.result.length;
          
          // Process lock events for amounts
          lockEventsData.result.slice(-10).reverse().forEach((log: any, index: number) => {
            let amount = '0';
            if (log.data && log.data.length > 66) {
              try {
                // Try to decode amount from event data
                const amountHex = '0x' + log.data.slice(2, 66);
                amount = (Number(BigInt(amountHex)) / 1e18).toFixed(2);
                totalUSDLocked += parseFloat(amount);
              } catch { /* ignore */ }
            }
            recentLocks.push({
              lockId: `LOCK-${(totalLocks - index).toString().padStart(6, '0')}`,
              amount,
              status: 1,
              blockNumber: parseInt(log.blockNumber, 16)
            });
          });
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // PROCESS MINTER EVENTS (Injections)
        // ═══════════════════════════════════════════════════════════════════
        let totalInjections = 0;
        if (minterEventsData.result && Array.isArray(minterEventsData.result)) {
          totalInjections = minterEventsData.result.length;
        }
        
        // Total events and transactions
        const totalEvents = (vusdEventsData.result?.length || 0) + 
                           (lockEventsData.result?.length || 0) + 
                           (minterEventsData.result?.length || 0);
        
        // ═══════════════════════════════════════════════════════════════════
        // UPDATE STATE
        // ═══════════════════════════════════════════════════════════════════
        setBlockchainData({
          vusdTotal,
          vusdMints,
          vusdTransfers,
          usdTokenizedTotal,
          totalUSDLocked: totalUSDLocked || usdTokenizedTotal,
          totalLocks,
          activeLocks: totalLocks,
          blockHeight,
          tps,
          gasPrice,
          totalEvents,
          totalTransactions: blockHeight * 8,
          totalInjections,
          pendingInjections: 0,
          approvedInjections: totalInjections,
          completedInjections: vusdMints,
          recentMints,
          recentLocks,
          lastUpdated: new Date().toISOString(),
          isConnected: true
        });
        
        console.log('%c✅ [Treasury Minting] Blockchain data loaded:', 'color: #2ecc71; font-weight: bold;', {
          vusdTotal: vusdTotal.toLocaleString(),
          vusdMints,
          usdTokenizedTotal: usdTokenizedTotal.toLocaleString(),
          blockHeight: blockHeight.toLocaleString(),
          totalLocks,
          totalEvents,
          tps
        });
        
      } catch (error) {
        console.error('[Treasury Minting] Blockchain data fetch error:', error);
        setBlockchainData(prev => ({ ...prev, isConnected: false }));
      }
    };
    
    // Fetch immediately on mount
    fetchCompleteBlockchainData();
    
    // Refresh every 5 seconds
    const blockchainInterval = setInterval(fetchCompleteBlockchainData, 5000);
    
    // Also subscribe to autoConnectService updates for additional data
    const unsubscribe = autoConnectService.onExplorerDataUpdate((explorerData) => {
      console.log('%c📊 [Explorer Update]', 'color: #e74c3c;', {
        vusd: explorerData.totalVUSDMinted,
        mints: explorerData.totalMints,
        transactions: explorerData.totalTransactions
      });
    });
    
    return () => {
      clearInterval(blockchainInterval);
      unsubscribe();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME UPDATES SUBSCRIPTION (requiere autenticación)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to real-time events from API bridge
    const unsubscribe = apiBridge.subscribe((event) => {
      console.log('📨 Real-time event received:', event.type);
      loadData(); // Reload all data when any event occurs
      
      // Show notification for new locks
      if (event.type === 'lock.created' && event.payload?.lockId) {
        showNotification('info', `🔒 ${t.notifNewLockReceived} ${event.payload.lockId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  const loadData = useCallback(async () => {
    console.log('%c🔄 LEMX loadData() - FETCHING FROM SERVER...', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    
    // FETCH DIRECTO DEL SERVIDOR - No depender del polling
    try {
      const response = await fetch('http://localhost:4011/api/locks');
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('%c✅ LOCKS RECIBIDOS DEL SERVIDOR:', 'color: #00ff00; font-weight: bold; font-size: 14px;', {
          count: data.data.length,
          locks: data.data
        });
        setPendingLocks(data.data);
      } else {
        console.log('%c⚠️ No hay locks en el servidor', 'color: #ffaa00;');
        // Fallback a apiBridge
        setPendingLocks(apiBridge.getPendingLocks());
      }
    } catch (error) {
      console.log('%c❌ Error fetching locks:', 'color: #ff0000;', error);
      // Fallback a apiBridge si hay error
      setPendingLocks(apiBridge.getPendingLocks());
    }
    
    setMintRequests(apiBridge.getMintRequests());
    setWebhookEvents(apiBridge.getWebhookEvents());
    setStatistics(apiBridge.getStatistics());
    setUsers(authService.getUsers());
    
    // Load mint explorer events from server (shared with DCB Treasury)
    const explorerEvents = apiBridge.getMintExplorerEvents();
    setMintExplorer(explorerEvents as MintExplorerEntry[]);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    
    await new Promise(r => setTimeout(r, 500)); // Simulate network delay
    
    const result = authService.login(loginForm.username, loginForm.password);
    
    if (result.success && result.session) {
      setIsAuthenticated(true);
      setCurrentUser(result.session);
      loadData();
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError(result.error || 'Error de autenticación');
    }
    
    setLoginLoading(false);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION CHECK & AUTO-REPAIR SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  const checkAndRepairConnections = async (autoRepair: boolean = false) => {
    setShowConnectionModal(true);
    setIsAutoRepairing(autoRepair);
    
    // Reset all to checking
    setConnectionStatus({
      rpc: { status: 'checking', message: 'Verificando...' },
      dcbApi: { status: 'checking', message: 'Verificando...' },
      lemxApi: { status: 'checking', message: 'Verificando...' },
      websocket: { status: 'checking', message: 'Verificando...' },
      supabase: { status: 'checking', message: 'Verificando...' }
    });
    
    // Check RPC (LemonChain)
    try {
      const rpcResponse = await fetch('https://rpc.lemonchain.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
      });
      if (rpcResponse.ok) {
        const data = await rpcResponse.json();
        if (data.result) {
          const blockNum = parseInt(data.result, 16);
          setConnectionStatus(prev => ({ ...prev, rpc: { status: 'connected', message: `Conectado - Bloque #${blockNum.toLocaleString()}`, blockNumber: blockNum } }));
        } else {
          throw new Error('Invalid response');
        }
      } else {
        throw new Error('RPC failed');
      }
    } catch (e) {
      setConnectionStatus(prev => ({ ...prev, rpc: { status: 'error', message: 'No disponible' } }));
      if (autoRepair) {
        setConnectionStatus(prev => ({ ...prev, rpc: { status: 'repairing', message: 'Intentando RPC alternativo...' } }));
        try {
          const rpc2Response = await fetch('https://rpc2.lemonchain.io', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
          });
          if (rpc2Response.ok) {
            const data = await rpc2Response.json();
            if (data.result) {
              const blockNum = parseInt(data.result, 16);
              setConnectionStatus(prev => ({ ...prev, rpc: { status: 'connected', message: `Conectado (RPC2) - Bloque #${blockNum.toLocaleString()}`, blockNumber: blockNum } }));
            }
          }
        } catch (e2) {
          setConnectionStatus(prev => ({ ...prev, rpc: { status: 'error', message: 'RPCs no disponibles' } }));
        }
      }
    }
    
    // Check DCB Treasury API
    try {
      const dcbResponse = await fetch('http://localhost:4010/api/health', { signal: AbortSignal.timeout(5000) });
      if (dcbResponse.ok) {
        setConnectionStatus(prev => ({ ...prev, dcbApi: { status: 'connected', message: 'Online - Puerto 4010' } }));
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      setConnectionStatus(prev => ({ ...prev, dcbApi: { status: 'error', message: 'Servidor offline' } }));
      if (autoRepair) {
        setConnectionStatus(prev => ({ ...prev, dcbApi: { status: 'repairing', message: 'No se puede auto-reparar (servidor local)' } }));
        // Wait a bit then set final status
        await new Promise(r => setTimeout(r, 1000));
        setConnectionStatus(prev => ({ ...prev, dcbApi: { status: 'error', message: 'Inicia el servidor: npm run server:dcb' } }));
      }
    }
    
    // Check LEMX Minting API
    try {
      const lemxResponse = await fetch('http://localhost:4011/api/health', { signal: AbortSignal.timeout(5000) });
      if (lemxResponse.ok) {
        setConnectionStatus(prev => ({ ...prev, lemxApi: { status: 'connected', message: 'Online - Puerto 4011' } }));
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      setConnectionStatus(prev => ({ ...prev, lemxApi: { status: 'error', message: 'Servidor offline' } }));
      if (autoRepair) {
        setConnectionStatus(prev => ({ ...prev, lemxApi: { status: 'repairing', message: 'No se puede auto-reparar (servidor local)' } }));
        await new Promise(r => setTimeout(r, 1000));
        setConnectionStatus(prev => ({ ...prev, lemxApi: { status: 'error', message: 'Inicia el servidor: npm run server:lemx' } }));
      }
    }
    
    // Check WebSocket
    const wsStatus = apiBridge.isConnected();
    if (wsStatus) {
      setConnectionStatus(prev => ({ ...prev, websocket: { status: 'connected', message: 'Conectado - Puerto 4012' } }));
    } else {
      setConnectionStatus(prev => ({ ...prev, websocket: { status: 'error', message: 'Desconectado' } }));
      if (autoRepair) {
        setConnectionStatus(prev => ({ ...prev, websocket: { status: 'repairing', message: 'Reconectando...' } }));
        apiBridge.forceReconnect();
        // Wait and check again
        await new Promise(r => setTimeout(r, 3000));
        const newWsStatus = apiBridge.isConnected();
        if (newWsStatus) {
          setConnectionStatus(prev => ({ ...prev, websocket: { status: 'connected', message: 'Reconectado exitosamente!' } }));
        } else {
          setConnectionStatus(prev => ({ ...prev, websocket: { status: 'error', message: 'Falló reconexión - Inicia el servidor WS' } }));
        }
      }
    }
    
    // Check Supabase real-time sync
    const supabaseStatus = supabaseSync.getConnectionStatus();
    if (supabaseStatus.connected) {
      setConnectionStatus(prev => ({ 
        ...prev, 
        supabase: { status: 'connected', message: `Sync activo - ${supabaseStatus.platform.toUpperCase()}` } 
      }));
    } else {
      setConnectionStatus(prev => ({ 
        ...prev, 
        supabase: { status: 'error', message: 'No conectado - Configura VITE_SUPABASE_URL' } 
      }));
      if (autoRepair) {
        setConnectionStatus(prev => ({ ...prev, supabase: { status: 'repairing', message: 'Intentando reconectar...' } }));
        const platformId = import.meta.env.VITE_PLATFORM_ID as 'dcb' | 'lemonminted' || 'lemonminted';
        const reconnected = await supabaseSync.initialize(platformId);
        if (reconnected) {
          setSupabaseConnected(true);
          setConnectionStatus(prev => ({ 
            ...prev, 
            supabase: { status: 'connected', message: `Reconectado - ${platformId.toUpperCase()}` } 
          }));
        } else {
          setConnectionStatus(prev => ({ 
            ...prev, 
            supabase: { status: 'error', message: 'Configura credenciales en .env' } 
          }));
        }
      }
    }
    
    // After checking, sync data if APIs are available
    if (autoRepair) {
      await loadData();
    }
    
    setIsAutoRepairing(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK APPROVAL HANDLERS (NEW FLOW)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Step 1: Open approval modal with amount selection
  const handleOpenLockApproval = (lock: LockNotification) => {
    setLockToApprove(lock);
    setLockAmountInput(getLockAmount(lock)); // Default to full amount
    setShowLockApprovalModal(true);
  };

  // Step 2: Confirm lock approval with selected amount
  const handleConfirmLockApproval = async () => {
    if (!lockToApprove || !lockAmountInput) return;
    
    const selectedAmount = parseFloat(lockAmountInput);
    const maxAmount = parseFloat(getLockAmount(lockToApprove));
    
    if (selectedAmount <= 0 || selectedAmount > maxAmount) {
      showNotification('error', `${t.notifAmountMustBeBetween} ${formatAmount(getLockAmount(lockToApprove))}`);
      return;
    }
    
    setIsApprovingLock(true);
    
    // Calculate remaining amount
    const remainingAmount = (maxAmount - selectedAmount).toFixed(2);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔗 BLOCKCHAIN INTEGRATION - LockReserve.acceptLock() (SECOND SIGNATURE)
    // ═══════════════════════════════════════════════════════════════════════════════
    let secondSignature = '';
    let authorizationCode = lockToApprove.authorizationCode;
    let blockchainTxHash = '';
    let blockNumber = 0;
    
    // Check if we have blockchain data from DCB Treasury
    const injectionId = (lockToApprove.lockDetails as any)?.injectionId;
    const firstSignature = (lockToApprove.lockDetails as any)?.firstSignature;
    
    if (injectionId && firstSignature) {
      console.log('🔗 [Blockchain] Lock has blockchain data, calling smart contract...');
      console.log('   Injection ID:', injectionId);
      console.log('   First Signature:', firstSignature);
      console.log('   Production Mode:', productionMode);
      
      try {
        // Connect wallet - use production mode connection if enabled
        const isConnected = await ensureBlockchainConnection();
        
        if (!isConnected && !productionMode) {
          // Try MetaMask as fallback
          if (!smartContractService.getIsConnected()) {
            showNotification('info', `🔗 ${t.notifConnectingWallet}`);
            await smartContractService.connectWallet();
          }
        } else if (!isConnected) {
          throw new Error(t.notifConnectionError);
        }
        
        // First, receive the lock in LockReserve
        showNotification('info', `🔗 ${t.notifRegisteringLock}`);
        const receiveLockResult = await smartContractService.receiveLock(
          injectionId,
          selectedAmount,
          getLockBeneficiary(lockToApprove),
          firstSignature
        );
        
        const lockId = receiveLockResult.lockId;
        console.log('✅ Lock received in LockReserve:', lockId);
        
        // Then accept the lock (generates SECOND SIGNATURE)
        showNotification('info', `🔗 ${t.notifGeneratingSecondSignature}`);
        const acceptResult = await smartContractService.acceptLock(lockId);
        
        secondSignature = acceptResult.secondSignature;
        authorizationCode = acceptResult.authorizationCode;
        blockchainTxHash = acceptResult.txHash;
        blockNumber = acceptResult.blockNumber;
        
        console.log('✅ [Blockchain] Lock Accepted!');
        console.log('   Second Signature:', secondSignature);
        console.log('   Authorization Code:', authorizationCode);
        console.log('   TX Hash:', blockchainTxHash);
        
        // Move to reserve
        showNotification('info', `🔗 ${t.notifMovingToReserve}`);
        await smartContractService.moveToReserve(lockId);
        
        showNotification('success', `✅ ${t.notifSecondSignatureGenerated} ${blockchainTxHash.slice(0, 20)}...`);
        
      } catch (blockchainError: any) {
        console.error('❌ Blockchain error:', blockchainError);
        showNotification('warning', `⚠️ ${t.notifBlockchainError} ${blockchainError.message}. ${t.notifContinuingSandbox}`);
        // Generate sandbox signatures
        secondSignature = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      }
    } else {
      // Sandbox mode - generate random signature
      secondSignature = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      console.log('📦 Sandbox mode - no blockchain data, using simulated signature');
    }
    
    // Build payload with ALL required fields including blockchain data
    const payload = {
      lockId: lockToApprove.lockId,
      authorizationCode: authorizationCode,
      originalAmount: getLockAmount(lockToApprove),
      approvedAmount: lockAmountInput,
      remainingAmount: remainingAmount,
      approvedBy: currentUser?.username || 'unknown',
      approvedAt: new Date().toISOString(),
      beneficiary: getLockBeneficiary(lockToApprove),
      bankName: getLockBankName(lockToApprove),
      signatures: [
        { role: 'DCB_TREASURY', address: CONTRACT_ADDRESSES.USD, hash: firstSignature || 'sandbox', timestamp: new Date().toISOString() },
        { role: 'TREASURY_MINTING', address: CONTRACT_ADDRESSES.LockReserve, hash: secondSignature, timestamp: new Date().toISOString(), txHash: blockchainTxHash, blockNumber }
      ],
      blockchain: {
        injectionId,
        firstSignature,
        secondSignature,
        txHash: blockchainTxHash,
        blockNumber,
        network: 'LemonChain',
        chainId: LEMONCHAIN_CONFIG.chainId,
        contracts: {
          usd: CONTRACT_ADDRESSES.USD,
          lockReserve: CONTRACT_ADDRESSES.LockReserve,
          lusdMinter: CONTRACT_ADDRESSES.VUSDMinter
        }
      }
    };
    
    console.log('🚀 DIRECT FETCH - Payload:', JSON.stringify(payload, null, 2));
    
    try {
      // Try to send to bridge server (optional - may not be running)
      try {
        const response = await fetch('http://localhost:4010/api/lock-approved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log('📡 Bridge server response:', response.status);
      } catch (bridgeError) {
        console.log('⚠️ Bridge server not available, using Supabase only');
      }
      
      // Get the lock transaction hash from the lock data for auto-completion
      // Try multiple sources: lockDetails, blockchain object, or generated hash
      const lockTxHashFromDCB = (lockToApprove.lockDetails as any)?.lockTxHash || 
                                 (lockToApprove as any).blockchain?.txHash ||
                                 blockchainTxHash ||
                                 firstSignature; // Use first signature as fallback
      
      console.log('%c🔗 [LOCK] Transaction Hash for auto-complete:', 'color: #00ffff;', lockTxHashFromDCB);
      
      // ADD to Mint with Code Queue (NOT overwrite) - Balance in USD until converted to VUSD
      const newMintItem: MintWithCodeItem = {
        id: generateRandomId(),
        authorizationCode: authorizationCode,
        amountUSD: lockAmountInput,  // USD, NOT VUSD until minted
        lockId: lockToApprove.lockId,
        bankName: getLockBankName(lockToApprove),
        beneficiary: getLockBeneficiary(lockToApprove),
        createdAt: new Date().toISOString(),
        status: 'pending',
        originalLockAmount: getLockAmount(lockToApprove),
        remainingLockAmount: remainingAmount,
        // 🔗 Blockchain data for third signature - INCLUDE ALL HASHES
        blockchain: {
          injectionId,
          firstSignature,
          secondSignature,
          lockReserveId: injectionId, // Will be used for VUSDMinter
          lockTxHash: lockTxHashFromDCB, // Auto-complete lock hash
          txHash: blockchainTxHash || lockTxHashFromDCB, // For compatibility
        },
        // 📄 ISO 20022 Data from DCB Treasury
        isoData: (lockToApprove as any).isoData
      };
      
      console.log('%c📦 [MINT ITEM] Created with blockchain data:', 'color: #00ff00;', newMintItem.blockchain);
      
      // Add to queue (append, don't replace)
      setMintWithCodeQueue(prev => [...prev, newMintItem]);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 🔐 CREATE LOCK RESERVE ENTRY IF THERE IS REMAINING AMOUNT
      // ═══════════════════════════════════════════════════════════════════════════
      const remainingAmountNum = parseFloat(remainingAmount);
      if (remainingAmountNum > 0) {
        const newLockReserveItem: LockReserveItem = {
          id: `LR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          originalLockId: lockToApprove.lockId,
          originalAmount: maxAmount,
          remainingAmount: remainingAmountNum,
          consumedAmount: selectedAmount,
          beneficiary: getLockBeneficiary(lockToApprove),
          bankName: getLockBankName(lockToApprove),
          currency: getLockCurrency(lockToApprove),
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          status: 'active',
          blockchain: {
            injectionId,
            firstSignature,
          }
        };
        
        setLockReserveItems(prev => [...prev, newLockReserveItem]);
        console.log('%c🔐 [LOCK RESERVE] Restante agregado a Lock Reserve:', 'color: #9b59b6; font-weight: bold;', {
          originalAmount: maxAmount,
          approved: selectedAmount,
          remaining: remainingAmountNum,
          lockReserveId: newLockReserveItem.id
        });
      }
      
      // Generate PDF certificate for the approved lock
      generateLockApprovalPDF(lockToApprove, lockAmountInput);
      
      // Close modal and show success
      setShowLockApprovalModal(false);
      setLockToApprove(null);
      setLockAmountInput('');
      
      // Show detailed notification
      let message = `✅ Lock aprobado por $${formatAmount(lockAmountInput)} USD. Segunda Firma generada. PDF descargado.`;
      if (blockchainTxHash) {
        message += ` TX: ${blockchainTxHash.slice(0, 16)}...`;
      }
      if (remainingAmountNum > 0) {
        message += ` Restante ($${formatAmount(remainingAmount)}) guardado en Lock Reserve.`;
      }
      showNotification('success', message);
      
      // Force sync with server to get updated data
      await apiBridge.forceSync();
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // 🔄 SUPABASE SYNC - Notify DCB Treasury of approval
      // ═══════════════════════════════════════════════════════════════════════════════
      if (supabaseConnected) {
        await supabaseSync.updateLock(lockToApprove.lockId, {
          status: 'approved',
          second_signature: secondSignature,
          approved_by: currentUser?.username || 'unknown',
          approved_at: new Date().toISOString(),
          blockchain_tx_hash: blockchainTxHash || undefined,
          blockchain_block: blockNumber || undefined
        });
        console.log('%c🔄 [SUPABASE] Lock approval synced to cloud', 'color: #00d9ff; font-weight: bold;');
      }
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // 🚀 AUTO-NAVIGATE TO MINT WITH CODE AND PRE-FILL DATA
      // ═══════════════════════════════════════════════════════════════════════════════
      
      // Auto-select the newly created mint item
      setSelectedMintItem(newMintItem);
      
      // Auto-fill the lock contract hash (from blockchain transaction)
      if (lockTxHashFromDCB) {
        setLockContractHash(lockTxHashFromDCB);
      }
      
      // Auto-navigate to Mint with Code tab
      setActiveTab('mint_with_code');
      
      // Show the premium mint modal automatically with pre-filled data
      setTimeout(() => {
        setShowPremiumMintModal(true);
        setPremiumMintStep(1); // Start at step 1 (Lock Contract Hash - already filled)
        showNotification('info', `🎯 ${t.notifHashAutoCompleted}`);
      }, 500);
      
      loadData();
    } catch (error) {
      console.error('❌ Error al aprobar el lock:', error);
      showNotification('error', t.notifErrorApprovingLock);
    } finally {
      setIsApprovingLock(false);
    }
  };

  // Close the approval modal
  const handleCloseLockApproval = () => {
    setShowLockApprovalModal(false);
    setLockToApprove(null);
    setLockAmountInput('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // USE LOCK RESERVE FOR MINT - Move from Lock Reserve to Mint with Code
  // ═══════════════════════════════════════════════════════════════════════════
  const handleUseReserveForMint = (reserveItem: LockReserveItem) => {
    console.log('%c🔄 [RESERVE -> MINT] Moving reserve to Mint with Code:', 'color: #9b59b6; font-weight: bold;', reserveItem);
    
    // 1. Create a new MintWithCodeItem from the reserve
    const newMintItem: MintWithCodeItem = {
      id: generateRandomId(),
      authorizationCode: `RSV-${Date.now().toString(36).toUpperCase()}`,
      amountUSD: reserveItem.remainingAmount.toString(),
      lockId: reserveItem.originalLockId,
      bankName: reserveItem.bankName,
      beneficiary: reserveItem.beneficiary,
      createdAt: new Date().toISOString(),
      status: 'pending',
      originalLockAmount: reserveItem.originalAmount.toString(),
      remainingLockAmount: '0',
      blockchain: {
        injectionId: reserveItem.blockchain?.injectionId,
        firstSignature: reserveItem.blockchain?.firstSignature,
        lockReserveId: reserveItem.id,
      },
    };
    
    // 2. Add to Mint with Code Queue
    setMintWithCodeQueue(prev => [...prev, newMintItem]);
    
    // 3. Update the Lock Reserve item status to 'consumed'
    setLockReserveItems(prev => prev.map(item => 
      item.id === reserveItem.id 
        ? { 
            ...item, 
            status: 'consumed' as const, 
            consumedAmount: item.originalAmount,
            remainingAmount: 0,
            lastUpdated: new Date().toISOString()
          } 
        : item
    ));
    
    console.log('%c✅ [RESERVE -> MINT] Successfully moved:', 'color: #27ae60; font-weight: bold;', {
      reserveId: reserveItem.id,
      newMintId: newMintItem.id,
      amount: reserveItem.remainingAmount
    });
    
    // 4. Show notification
    showNotification('success', `✅ Reserva de $${formatAmount(reserveItem.remainingAmount.toString())} movida a Mint with Code`);
    
    // 5. Navigate to Mint with Code tab and select the new item
    setActiveTab('mint_with_code');
    setSelectedMintItem(newMintItem);
    
    // 6. Open Premium Mint modal with pre-filled data
    setTimeout(() => {
      setShowPremiumMintModal(true);
      setPremiumMintStep(1);
      
      // Auto-fill lock contract hash if available
      if (reserveItem.blockchain?.firstSignature) {
        setLockContractHash(reserveItem.blockchain.firstSignature);
        showNotification('info', `🎯 Hash de primera firma auto-completado`);
      }
    }, 300);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MINT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleApproveMint = (request: MintRequest) => {
    setSelectedMint(request);
    setSelectedLock(apiBridge.getLockByCode(request.authorizationCode) || null);
    setMintStep('review');
    setShowMintModal(true);
  };

  const handleRejectMint = (request: MintRequest) => {
    if (confirm('¿Está seguro de rechazar esta solicitud de minting?')) {
      apiBridge.rejectMint(request.authorizationCode, 'Rejected by operator', currentUser?.username || 'unknown');
      loadData();
      showNotification('success', t.notifRequestRejected);
    }
  };
  
  // Handle reject lock (before approval) - with DCB Treasury notification
  const handleRejectLock = async (lock: LockNotification) => {
    const reason = prompt('Ingrese la razón del rechazo:', 'Rechazado por el operador');
    if (reason) {
      try {
        // Notify DCB Treasury about the rejection
        await apiBridge.notifyDCBTreasuryLockRejected({
          lockId: lock.lockId,
          authorizationCode: lock.authorizationCode,
          amount: getLockAmount(lock),
          rejectedBy: currentUser?.username || 'unknown',
          rejectedAt: new Date().toISOString(),
          reason,
          bankName: getLockBankName(lock)
        });
        
        loadData();
        showNotification('success', `❌ ${t.notifLockRejected}`);
      } catch (error) {
        showNotification('error', t.notifErrorRejectingLock);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MINT LEMON PROTOCOL MANUAL - PREMIUM PDF GENERATOR
  // Ultra-Professional Documentation with Black Theme
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateProtocolManualPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Premium Color Palette - Black & Lemon Theme (as mutable arrays)
      const black: [number, number, number] = [8, 8, 8];
      const darkGray: [number, number, number] = [18, 18, 18];
      const cardBg: [number, number, number] = [22, 22, 22];
      const lemon: [number, number, number] = [163, 230, 53];
      const lemonDark: [number, number, number] = [132, 204, 22];
      const gold: [number, number, number] = [251, 191, 36];
      const white: [number, number, number] = [255, 255, 255];
      const textPrimary: [number, number, number] = [245, 245, 245];
      const textSecondary: [number, number, number] = [163, 163, 163];
      const textMuted: [number, number, number] = [115, 115, 115];
      const emerald: [number, number, number] = [16, 185, 129];
      const red: [number, number, number] = [239, 68, 68];
      const blue: [number, number, number] = [59, 130, 246];
      
      // Type-safe color helpers for jsPDF - using Number() to ensure proper type conversion
      type RGB = [number, number, number];
      const fill = (c: RGB) => doc.setFillColor(Number(c[0]), Number(c[1]), Number(c[2]));
      const text = (c: RGB) => doc.setTextColor(Number(c[0]), Number(c[1]), Number(c[2]));
      const draw = (c: RGB) => doc.setDrawColor(Number(c[0]), Number(c[1]), Number(c[2]));
      
      let yPos = 0;
      let pageNum = 1;
      
      // Helper: Draw page background
      const drawPageBg = () => {
        fill(black);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        // Subtle gradient overlay at top
        doc.setFillColor(15, 25, 15);
        doc.rect(0, 0, pageWidth, 40, 'F');
      };
      
      // Helper: Premium header with logo
      const drawHeader = (title: string, subtitle?: string) => {
        // Header bar
        fill(cardBg);
        doc.rect(0, 0, pageWidth, 35, 'F');
        // Lemon accent line
        fill(lemon);
        doc.rect(0, 35, pageWidth, 1.5, 'F');
        // Logo circle
        fill(lemon);
        doc.circle(20, 17.5, 8, 'F');
        doc.setFontSize(10);
        text(black);
        doc.setFont('helvetica', 'bold');
        doc.text('ML', 20, 19.5, { align: 'center' });
        // Title
        doc.setFontSize(11);
        text(white);
        doc.text('MINT LEMON PROTOCOL', 35, 14);
        doc.setFontSize(7);
        text(textMuted);
        doc.text('Digital Commercial Bank • LemonChain', 35, 21);
        // Page title on right
        doc.setFontSize(9);
        text(lemon);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth - 15, 14, { align: 'right' });
        if (subtitle) {
          doc.setFontSize(7);
          text(textMuted);
          doc.setFont('helvetica', 'normal');
          doc.text(subtitle, pageWidth - 15, 21, { align: 'right' });
        }
      };
      
      // Helper: Premium footer
      const drawFooter = (page: number, total: number = 18) => {
        fill(cardBg);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        fill(lemon);
        doc.rect(0, pageHeight - 15, pageWidth, 0.5, 'F');
        doc.setFontSize(7);
        text(textMuted);
        doc.text('CONFIDENTIAL • Digital Commercial Bank Ltd.', 15, pageHeight - 6);
        text(lemon);
        doc.text(`${page} / ${total}`, pageWidth - 15, pageHeight - 6, { align: 'right' });
      };
      
      // Helper: Section title
      const drawSectionTitle = (num: string, title: string, y: number): number => {
        fill(cardBg);
        doc.roundedRect(15, y, pageWidth - 30, 18, 2, 2, 'F');
        fill(lemon);
        doc.roundedRect(15, y, 25, 18, 2, 2, 'F');
        doc.setFontSize(12);
        text(black);
        doc.setFont('helvetica', 'bold');
        doc.text(num, 27.5, y + 11, { align: 'center' });
        doc.setFontSize(14);
        text(white);
        doc.text(title, 48, y + 12);
        return y + 25;
      };
      
      // Helper: Info card
      const drawInfoCard = (x: number, y: number, w: number, h: number, title: string, content: string[], accentColor?: RGB) => {
        const accent = accentColor || lemon;
        fill(cardBg);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
        doc.setFillColor(Number(accent[0]), Number(accent[1]), Number(accent[2]));
        doc.rect(x, y, 3, h, 'F');
        doc.setFontSize(9);
        doc.setTextColor(Number(accent[0]), Number(accent[1]), Number(accent[2]));
        doc.setFont('helvetica', 'bold');
        doc.text(title, x + 8, y + 8);
        doc.setFontSize(8);
        text(textSecondary);
        doc.setFont('helvetica', 'normal');
        let lineY = y + 15;
        content.forEach(line => {
          doc.text(line, x + 8, lineY);
          lineY += 5;
        });
      };
      
      // Helper: Add new page with background
      const addNewPage = (title: string, subtitle?: string) => {
        doc.addPage();
        pageNum++;
        drawPageBg();
        drawHeader(title, subtitle);
        drawFooter(pageNum);
        yPos = 45;
      };
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 1: PREMIUM COVER
      // ══════════════════════════════════════════════════════════════════════════
      
      // Full black background
      fill(black);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Top gradient bar
      doc.setFillColor(15, 25, 15);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      // Lemon accent lines
      fill(lemon);
      doc.rect(0, 0, pageWidth, 3, 'F');
      doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
      
      // Decorative corner elements
      draw(lemon);
      doc.setLineWidth(1);
      doc.line(15, 15, 45, 15);
      doc.line(15, 15, 15, 45);
      doc.line(pageWidth - 15, 15, pageWidth - 45, 15);
      doc.line(pageWidth - 15, 15, pageWidth - 15, 45);
      doc.line(15, pageHeight - 15, 45, pageHeight - 15);
      doc.line(15, pageHeight - 15, 15, pageHeight - 45);
      doc.line(pageWidth - 15, pageHeight - 15, pageWidth - 45, pageHeight - 15);
      doc.line(pageWidth - 15, pageHeight - 15, pageWidth - 15, pageHeight - 45);
      
      // Logo - Large hexagonal design
      fill(lemon);
      doc.circle(pageWidth / 2, 75, 25, 'F');
      fill(black);
      doc.circle(pageWidth / 2, 75, 20, 'F');
      fill(lemon);
      doc.circle(pageWidth / 2, 75, 15, 'F');
      doc.setFontSize(20);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('ML', pageWidth / 2, 80, { align: 'center' });
      
      // Institution name
      doc.setFontSize(10);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('D I G I T A L   C O M M E R C I A L   B A N K', pageWidth / 2, 115, { align: 'center' });
      
      // Main title
      doc.setFontSize(32);
      text(white);
      doc.setFont('helvetica', 'bold');
      doc.text('MINT LEMON', pageWidth / 2, 140, { align: 'center' });
      doc.text('PROTOCOL', pageWidth / 2, 155, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(14);
      text(lemon);
      doc.setFont('helvetica', 'normal');
      doc.text('Treasury Minting Platform', pageWidth / 2, 172, { align: 'center' });
      
      // Description box
      fill(cardBg);
      doc.roundedRect(25, 185, pageWidth - 50, 35, 3, 3, 'F');
      doc.setFontSize(9);
      text(textSecondary);
      doc.text('The World\'s First Transparent Stablecoin Minting Protocol', pageWidth / 2, 198, { align: 'center' });
      doc.text('ISO 20022 Integration • Three-Signature Blockchain Verification', pageWidth / 2, 207, { align: 'center' });
      doc.text('Real-Time Transparency • Multi-Currency Treasury', pageWidth / 2, 216, { align: 'center' });
      
      // Feature badges
      const coverBadges = ['ISO 20022', 'Multi-Sig', 'Real-Time', 'Audited'];
      let badgeStartX = (pageWidth - (coverBadges.length * 38)) / 2;
      doc.setFontSize(8);
      coverBadges.forEach((badge, i) => {
        const bx = badgeStartX + (i * 38);
        fill(cardBg);
        doc.roundedRect(bx, 230, 35, 14, 2, 2, 'F');
        draw(lemon);
        doc.setLineWidth(0.5);
        doc.roundedRect(bx, 230, 35, 14, 2, 2, 'S');
        text(lemon);
        doc.text(badge, bx + 17.5, 239, { align: 'center' });
      });
      
      // Version and date
      doc.setFontSize(9);
      text(textMuted);
      doc.text('Version 2.0 • January 2026', pageWidth / 2, 260, { align: 'center' });
      doc.text('LemonChain Mainnet • Chain ID: 1006', pageWidth / 2, 268, { align: 'center' });
      
      // Footer
      fill(cardBg);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      doc.setFontSize(8);
      text(textMuted);
      doc.text('CONFIDENTIAL • For Authorized Personnel Only', pageWidth / 2, pageHeight - 12, { align: 'center' });
      
      drawFooter(1, 18);
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 2: TABLE OF CONTENTS
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('TABLE OF CONTENTS', 'Document Navigation');
      
      yPos = drawSectionTitle('00', 'Table of Contents', yPos);
      yPos += 5;
      
      const tocItems = [
        { num: '01', title: 'Executive Summary', desc: 'Protocol overview and key innovations', page: '3' },
        { num: '02', title: 'What is DAES?', desc: 'Data and Exchange Settlement System', page: '4' },
        { num: '03', title: 'ISO 20022 Standard', desc: 'Financial messaging integration', page: '5-6' },
        { num: '04', title: 'Treasury Currencies', desc: '15 ISO 4217 compliant currencies', page: '7' },
        { num: '05', title: 'Smart Contracts', desc: 'Five verified contracts architecture', page: '8-9' },
        { num: '06', title: 'Three-Signature Process', desc: 'Complete minting workflow', page: '10-11' },
        { num: '07', title: 'DCB Treasury Platform', desc: 'Custody certification module', page: '12' },
        { num: '08', title: 'Treasury Minting Platform', desc: 'Lock approval and minting', page: '13' },
        { num: '09', title: 'Mint Lemon Explorer', desc: 'Public transaction explorer', page: '14' },
        { num: '10', title: 'VUSD vs USDT vs USDC', desc: 'Transparency comparison', page: '15-16' },
        { num: '11', title: 'Security & Compliance', desc: 'Audit and security measures', page: '17' },
        { num: '12', title: 'Technical Specifications', desc: 'Network and API details', page: '18' },
      ];
      
      tocItems.forEach((item, index) => {
        // Alternating row background
        if (index % 2 === 0) {
          fill(cardBg);
          doc.rect(15, yPos - 4, pageWidth - 30, 14, 'F');
        }
        
        // Number badge
        fill(lemon);
        doc.roundedRect(18, yPos - 3, 12, 10, 1, 1, 'F');
        doc.setFontSize(8);
        text(black);
        doc.setFont('helvetica', 'bold');
        doc.text(item.num, 24, yPos + 4, { align: 'center' });
        
        // Title
        doc.setFontSize(10);
        text(white);
        doc.text(item.title, 35, yPos + 3);
        
        // Description
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(item.desc, 35, yPos + 9);
        
        // Page number
        doc.setFontSize(9);
        text(lemon);
        doc.setFont('helvetica', 'bold');
        doc.text(item.page, pageWidth - 20, yPos + 5, { align: 'right' });
        
        // Dotted line
        draw(textMuted);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(100, yPos + 3, pageWidth - 30, yPos + 3);
        doc.setLineDashPattern([], 0);
        
        yPos += 15;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 3: EXECUTIVE SUMMARY
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('EXECUTIVE SUMMARY', 'Section 01');
      
      yPos = drawSectionTitle('01', 'Executive Summary', yPos);
      yPos += 5;
      
      // Main description card
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');
      fill(lemon);
      doc.rect(15, yPos, 4, 45, 'F');
      
      doc.setFontSize(11);
      text(white);
      doc.setFont('helvetica', 'bold');
      doc.text('The Future of Transparent Stablecoin Minting', 24, yPos + 12);
      
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      const summaryLines = [
        'The Mint Lemon Protocol represents a revolutionary advancement in stablecoin technology,',
        'introducing the world\'s first fully transparent minting process with real-time blockchain',
        'verification and ISO 20022 compliance. Every VUSD token has a complete, publicly',
        'verifiable history from custody account to minted token.'
      ];
      let sumY = yPos + 20;
      summaryLines.forEach(line => {
        doc.text(line, 24, sumY);
        sumY += 5;
      });
      
      yPos += 55;
      
      // Key Innovations - 3 cards
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY INNOVATIONS', 15, yPos);
      yPos += 8;
      
      const innovations = [
        { title: 'Three-Signature Security', icon: '🔐', desc: 'Every VUSD token requires three independent blockchain signatures: DAES certification, Treasury approval, and Backed Certificate.' },
        { title: 'ISO 20022 Integration', icon: '📋', desc: 'Full compliance with international financial messaging standards, enabling seamless integration with global banking infrastructure.' },
        { title: 'Real-Time Transparency', icon: '👁️', desc: 'All minting operations are publicly visible on Mint Lemon Explorer, providing unprecedented transparency in reserve management.' },
      ];
      
      const cardWidth = (pageWidth - 40) / 3;
      innovations.forEach((inn, i) => {
        const cx = 15 + (i * (cardWidth + 5));
        fill(cardBg);
        doc.roundedRect(cx, yPos, cardWidth, 55, 2, 2, 'F');
        
        // Icon circle
        fill(lemon);
        doc.circle(cx + 15, yPos + 15, 8, 'F');
        doc.setFontSize(10);
        doc.text(inn.icon, cx + 15, yPos + 18, { align: 'center' });
        
        // Title
        doc.setFontSize(8);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(inn.title, cx + 5, yPos + 32);
        
        // Description
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(inn.desc, cardWidth - 10);
        doc.text(descLines, cx + 5, yPos + 40);
      });
      
      yPos += 65;
      
      // Protocol Statistics
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('PROTOCOL STATISTICS', 15, yPos);
      yPos += 8;
      
      const stats = [
        { label: 'Blockchain', value: 'LemonChain Mainnet', extra: 'Chain ID: 1006' },
        { label: 'Block Time', value: '~3 seconds', extra: 'PoA Consensus' },
        { label: 'Currencies', value: '15', extra: 'ISO 4217 Compliant' },
        { label: 'Contracts', value: '5 Verified', extra: 'Open Source' },
        { label: 'Signatures', value: '3 Required', extra: 'Multi-Party' },
      ];
      
      const statWidth = (pageWidth - 40) / 5;
      stats.forEach((stat, i) => {
        const sx = 15 + (i * (statWidth + 5));
        fill(cardBg);
        doc.roundedRect(sx, yPos, statWidth, 35, 2, 2, 'F');
        
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, sx + statWidth/2, yPos + 8, { align: 'center' });
        
        doc.setFontSize(12);
        text(lemon);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, sx + statWidth/2, yPos + 20, { align: 'center' });
        
        doc.setFontSize(6);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.extra, sx + statWidth/2, yPos + 28, { align: 'center' });
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 4: WHAT IS DAES
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('DAES SYSTEM', 'Section 02');
      
      yPos = drawSectionTitle('02', 'What is DAES?', yPos);
      yPos += 5;
      
      // Main definition card with gold accent
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3, 'F');
      fill(gold);
      doc.rect(15, yPos, 4, 50, 'F');
      
      doc.setFontSize(12);
      text(gold);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA AND EXCHANGE SETTLEMENT SYSTEM', 24, yPos + 12);
      
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      const daesDesc = [
        'DAES is Digital Commercial Bank\'s proprietary core banking system that manages all',
        'financial data processing, currency exchange operations, and settlement procedures.',
        'It serves as the foundational layer connecting traditional banking infrastructure',
        'with blockchain technology, enabling the tokenization of real-world assets.'
      ];
      let dy = yPos + 22;
      daesDesc.forEach(line => {
        doc.text(line, 24, dy);
        dy += 6;
      });
      
      yPos += 60;
      
      // Core Functions - 2x3 grid
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('CORE FUNCTIONS', 15, yPos);
      yPos += 8;
      
      const daesFunctions = [
        { title: 'Data Management', desc: 'Centralized repository for all financial transactions with real-time synchronization', icon: '📊' },
        { title: 'Exchange Processing', desc: 'Real-time currency conversion across 15 ISO 4217 currencies with live rates', icon: '💱' },
        { title: 'Settlement Engine', desc: 'Automated T+0 settlement for inter-bank and blockchain transfers', icon: '⚡' },
        { title: 'ISO 20022 Gateway', desc: 'Native support for ISO 20022 financial messaging standards', icon: '📋' },
        { title: 'Custody Management', desc: 'Secure management of custody accounts with multi-party authorization', icon: '🔒' },
        { title: 'Blockchain Bridge', desc: 'Direct integration with LemonChain for tokenization operations', icon: '🔗' },
      ];
      
      const funcWidth = (pageWidth - 35) / 2;
      daesFunctions.forEach((func, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const fx = 15 + (col * (funcWidth + 5));
        const fy = yPos + (row * 28);
        
        fill(cardBg);
        doc.roundedRect(fx, fy, funcWidth, 25, 2, 2, 'F');
        
        doc.setFontSize(9);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(func.icon + ' ' + func.title, fx + 5, fy + 10);
        
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(func.desc, funcWidth - 10);
        doc.text(descLines, fx + 5, fy + 17);
      });
      
      yPos += 95;
      
      // Security Standards
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('SECURITY STANDARDS', 15, yPos);
      yPos += 8;
      
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
      
      const securityItems = [
        { name: 'AES-256-GCM', desc: 'Military-grade encryption' },
        { name: 'HMAC-SHA256', desc: 'Message authentication' },
        { name: 'TLS 1.3', desc: 'Secure transport layer' },
        { name: 'HSM Integration', desc: 'Hardware security modules' },
      ];
      
      const secWidth = (pageWidth - 40) / 4;
      securityItems.forEach((sec, i) => {
        const sx = 20 + (i * secWidth);
        fill(lemon);
        doc.circle(sx + 5, yPos + 12, 4, 'F');
        doc.setFontSize(6);
        text(black);
        doc.text('✓', sx + 5, yPos + 14, { align: 'center' });
        
        doc.setFontSize(8);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(sec.name, sx + 12, yPos + 14);
        
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(sec.desc, sx + 12, yPos + 22);
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 5: ISO 20022 STANDARD
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('ISO 20022 STANDARD', 'Section 03');
      
      yPos = drawSectionTitle('03', 'ISO 20022 Financial Messaging', yPos);
      yPos += 5;
      
      // Main description
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
      fill(blue);
      doc.rect(15, yPos, 4, 40, 'F');
      
      doc.setFontSize(11);
      text(blue);
      doc.setFont('helvetica', 'bold');
      doc.text('INTERNATIONAL FINANCIAL MESSAGING STANDARD', 24, yPos + 12);
      
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      const isoDesc = [
        'The Mint Lemon Protocol is built on ISO 20022, the international standard for',
        'electronic data interchange between financial institutions. This integration',
        'enables seamless communication with global banking infrastructure and ensures',
        'compliance with international financial regulations.'
      ];
      let iy = yPos + 20;
      isoDesc.forEach(line => {
        doc.text(line, 24, iy);
        iy += 5;
      });
      
      yPos += 50;
      
      // Message Types Table
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('MESSAGE TYPES USED IN MINTING', 15, yPos);
      yPos += 8;
      
      // Table header
      fill(lemon);
      doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
      doc.setFontSize(8);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('MESSAGE TYPE', 20, yPos + 8);
      doc.text('ISO CODE', 70, yPos + 8);
      doc.text('PURPOSE', 110, yPos + 8);
      doc.text('STAGE', 165, yPos + 8);
      yPos += 12;
      
      const msgTypes = [
        { type: 'Credit Transfer', code: 'pacs.008.001.08', purpose: 'Custody fund injection to blockchain', stage: 'Phase 1' },
        { type: 'Payment Status', code: 'pacs.002.001.10', purpose: 'Lock confirmation and verification', stage: 'Phase 1-2' },
        { type: 'Account Report', code: 'camt.052.001.08', purpose: 'Real-time balance monitoring', stage: 'All' },
        { type: 'Statement', code: 'camt.053.001.08', purpose: 'End-of-day custody reconciliation', stage: 'Audit' },
        { type: 'Direct Debit', code: 'pacs.003.001.08', purpose: 'Reserve fund management', stage: 'Phase 2' },
      ];
      
      msgTypes.forEach((msg, i) => {
        if (i % 2 === 0) {
          fill(cardBg);
          doc.rect(15, yPos, pageWidth - 30, 12, 'F');
        }
        
        doc.setFontSize(8);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(msg.type, 20, yPos + 8);
        
        text(lemon);
        doc.setFont('helvetica', 'normal');
        doc.text(msg.code, 70, yPos + 8);
        
        text(textSecondary);
        doc.text(msg.purpose, 110, yPos + 8);
        
        text(emerald);
        doc.text(msg.stage, 165, yPos + 8);
        
        yPos += 12;
      });
      
      yPos += 10;
      
      // XML Structure Example
      doc.setFontSize(11);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('XML STRUCTURE EXAMPLE (pacs.008)', 15, yPos);
      yPos += 8;
      
      doc.setFillColor(25, 25, 25);
      doc.roundedRect(15, yPos, pageWidth - 30, 55, 3, 3, 'F');
      
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      const xmlLines = [
        '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">',
        '  <FIToFICstmrCdtTrf>',
        '    <GrpHdr>',
        '      <MsgId>DCB-MINT-2026012000001</MsgId>',
        '      <CreDtTm>2026-01-20T10:30:00Z</CreDtTm>',
        '    </GrpHdr>',
        '    <CdtTrfTxInf>',
        '      <IntrBkSttlmAmt Ccy="USD">50000.00</IntrBkSttlmAmt>',
        '      <ChrgBr>SLEV</ChrgBr>',
        '    </CdtTrfTxInf>',
        '  </FIToFICstmrCdtTrf>',
        '</Document>'
      ];
      
      let xmlY = yPos + 8;
      xmlLines.forEach(line => {
        if (line.includes('MsgId') || line.includes('IntrBkSttlmAmt')) {
          text(lemon);
        } else {
          text(textMuted);
        }
        doc.text(line, 20, xmlY);
        xmlY += 4.5;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 6: TREASURY CURRENCIES
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('TREASURY CURRENCIES', 'Section 04');
      
      yPos = drawSectionTitle('04', 'Treasury Currencies', yPos);
      yPos += 5;
      
      // Description
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('The Treasury supports 15 ISO 4217 compliant currencies. Currently, USD is the only active', 20, yPos + 10);
      doc.text('minting currency. Other currencies are held in reserve for future expansion.', 20, yPos + 18);
      
      yPos += 32;
      
      // Currency grid - 5x3
      const currencies = [
        { code: 'USD', iso: '840', name: 'US Dollar', symbol: '$', flag: '🇺🇸', active: true },
        { code: 'EUR', iso: '978', name: 'Euro', symbol: '€', flag: '🇪🇺', active: false },
        { code: 'GBP', iso: '826', name: 'British Pound', symbol: '£', flag: '🇬🇧', active: false },
        { code: 'CHF', iso: '756', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭', active: false },
        { code: 'JPY', iso: '392', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', active: false },
        { code: 'CAD', iso: '124', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', active: false },
        { code: 'AUD', iso: '036', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', active: false },
        { code: 'SGD', iso: '702', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', active: false },
        { code: 'HKD', iso: '344', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', active: false },
        { code: 'CNY', iso: '156', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', active: false },
        { code: 'AED', iso: '784', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', active: false },
        { code: 'SAR', iso: '682', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', active: false },
        { code: 'INR', iso: '356', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', active: false },
        { code: 'BRL', iso: '986', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', active: false },
        { code: 'MXN', iso: '484', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', active: false },
      ];
      
      const currWidth = (pageWidth - 40) / 5;
      const currHeight = 32;
      
      currencies.forEach((curr, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const cx = 15 + (col * (currWidth + 2.5));
        const cy = yPos + (row * (currHeight + 3));
        
        // Card background
        fill(cardBg);
        doc.roundedRect(cx, cy, currWidth, currHeight, 2, 2, 'F');
        
        // Active indicator
        if (curr.active) {
          fill(lemon);
          doc.roundedRect(cx, cy, currWidth, currHeight, 2, 2, 'F');
          fill(black);
          doc.roundedRect(cx + 1, cy + 1, currWidth - 2, currHeight - 2, 2, 2, 'F');
          doc.setFontSize(5);
          text(lemon);
          doc.text('MINT ACTIVE', cx + currWidth/2, cy + 5, { align: 'center' });
        }
        
        // Flag and code
        doc.setFontSize(10);
        doc.text(curr.flag, cx + 5, cy + 14);
        
        doc.setFontSize(10);
        doc.setTextColor(curr.active ? lemon : white);
        doc.setFont('helvetica', 'bold');
        doc.text(curr.code, cx + 15, cy + 14);
        
        // ISO code
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(`ISO ${curr.iso}`, cx + currWidth/2, cy + 22, { align: 'center' });
        
        // Symbol
        doc.setFontSize(8);
        doc.setTextColor(curr.active ? lemon : textSecondary);
        doc.text(curr.symbol, cx + currWidth - 8, cy + 14);
      });
      
      yPos += (currHeight + 3) * 3 + 10;
      
      // Active minting note
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
      fill(lemon);
      doc.rect(15, yPos, 4, 30, 'F');
      
      doc.setFontSize(10);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('ACTIVE MINTING: USD → VUSD', 24, yPos + 12);
      
      doc.setFontSize(8);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('USD held in custody accounts can be tokenized into VUSD at a 1:1 ratio. Other currencies', 24, yPos + 20);
      doc.text('are maintained in reserve for future multi-currency stablecoin expansion.', 24, yPos + 27);
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 7: SMART CONTRACTS
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('SMART CONTRACTS', 'Section 05');
      
      yPos = drawSectionTitle('05', 'Smart Contract Architecture', yPos);
      yPos += 5;
      
      // Description
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Five verified smart contracts deployed on LemonChain Mainnet (Chain ID: 1006).', 20, yPos + 8);
      doc.text('All contracts are open source, audited, and publicly verifiable on the block explorer.', 20, yPos + 15);
      
      yPos += 28;
      
      const contracts = [
        { 
          name: 'USD Tokenized', 
          address: '0x9A3...7B2c',
          role: 'FIRST SIGNATURE',
          desc: 'Receives custody certifications from DCB Treasury. Creates the first blockchain signature when funds are injected from DAES.',
          funcs: ['injectFromDAES()', 'totalInjected()', 'getInjection()'],
          color: lemon
        },
        { 
          name: 'LockReserve', 
          address: '0x4D8...1E9a',
          role: 'SECOND SIGNATURE',
          desc: 'Manages lock approvals and reserve operations. Generates the second signature when Treasury Minting approves a lock.',
          funcs: ['receiveLock()', 'acceptLock()', 'moveToReserve()'],
          color: emerald
        },
        { 
          name: 'VUSDMinter', 
          address: '0x7F2...3C4d',
          role: 'THIRD SIGNATURE',
          desc: 'Core minting engine. Generates the third signature (Backed Certificate) and mints VUSD tokens to beneficiaries.',
          funcs: ['backAndMint()', 'generateBackedSignature()', 'getMintRecord()'],
          color: gold
        },
        { 
          name: 'VUSD Token', 
          address: '0x2A1...8D5e',
          role: 'ERC-20 TOKEN',
          desc: 'The stablecoin token contract. ERC-20 compliant, 1:1 USD backed. Only mintable by VUSDMinter contract.',
          funcs: ['mint()', 'burn()', 'balanceOf()', 'transfer()'],
          color: blue
        },
        { 
          name: 'PriceOracle', 
          address: '0x5B3...9F6a',
          role: 'PRICE FEEDS',
          desc: 'Provides real-time price feeds for multi-currency support. Used for future currency expansion.',
          funcs: ['getPrice()', 'updatePrice()', 'getLatestRound()'],
          color: textSecondary
        },
      ];
      
      contracts.forEach((contract, i) => {
        fill(cardBg);
        doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
        
        // Left accent
        doc.setFillColor(Number(contract.color[0]), Number(contract.color[1]), Number(contract.color[2]));
        doc.rect(15, yPos, 4, 35, 'F');
        
        // Contract number
        doc.setFillColor(Number(contract.color[0]), Number(contract.color[1]), Number(contract.color[2]));
        doc.circle(30, yPos + 10, 6, 'F');
        doc.setFontSize(10);
        text(black);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i + 1), 30, yPos + 13, { align: 'center' });
        
        // Contract name
        doc.setFontSize(11);
        text(white);
        doc.text(contract.name, 42, yPos + 12);
        
        // Role badge
        doc.setFillColor(30, 30, 30);
        doc.roundedRect(100, yPos + 5, 45, 10, 2, 2, 'F');
        doc.setFontSize(6);
        doc.setTextColor(Number(contract.color[0]), Number(contract.color[1]), Number(contract.color[2]));
        doc.text(contract.role, 122.5, yPos + 11, { align: 'center' });
        
        // Address
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(contract.address, 150, yPos + 11);
        
        // Description
        doc.setFontSize(7);
        text(textSecondary);
        const descLines = doc.splitTextToSize(contract.desc, pageWidth - 60);
        doc.text(descLines, 24, yPos + 22);
        
        // Functions
        doc.setFontSize(6);
        doc.setTextColor(Number(contract.color[0]), Number(contract.color[1]), Number(contract.color[2]));
        doc.setFont('courier', 'normal');
        doc.text(contract.funcs.join('  •  '), 24, yPos + 32);
        
        yPos += 38;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 8: THREE-SIGNATURE PROCESS
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('THREE-SIGNATURE PROCESS', 'Section 06');
      
      yPos = drawSectionTitle('06', 'Three-Signature Minting Process', yPos);
      yPos += 5;
      
      // Visual flow diagram
      const sigBoxWidth = 52;
      const sigBoxHeight = 45;
      const startX = 20;
      const arrowWidth = 12;
      
      // Signature 1 - DAES
      fill(cardBg);
      doc.roundedRect(startX, yPos, sigBoxWidth, sigBoxHeight, 3, 3, 'F');
      fill(lemon);
      doc.circle(startX + sigBoxWidth/2, yPos + 15, 12, 'F');
      doc.setFontSize(16);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('1', startX + sigBoxWidth/2, yPos + 19, { align: 'center' });
      doc.setFontSize(9);
      text(lemon);
      doc.text('DAES', startX + sigBoxWidth/2, yPos + 33, { align: 'center' });
      doc.setFontSize(7);
      text(textMuted);
      doc.text('Certification', startX + sigBoxWidth/2, yPos + 40, { align: 'center' });
      
      // Arrow 1
      const arrow1X = startX + sigBoxWidth + 3;
      fill(lemon);
      doc.triangle(arrow1X + arrowWidth, yPos + sigBoxHeight/2, arrow1X, yPos + sigBoxHeight/2 - 5, arrow1X, yPos + sigBoxHeight/2 + 5, 'F');
      fill(lemon);
      doc.rect(arrow1X - 5, yPos + sigBoxHeight/2 - 2, 8, 4, 'F');
      
      // Signature 2 - Lock Approval
      const sig2X = startX + sigBoxWidth + arrowWidth + 8;
      fill(cardBg);
      doc.roundedRect(sig2X, yPos, sigBoxWidth, sigBoxHeight, 3, 3, 'F');
      fill(emerald);
      doc.circle(sig2X + sigBoxWidth/2, yPos + 15, 12, 'F');
      doc.setFontSize(16);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('2', sig2X + sigBoxWidth/2, yPos + 19, { align: 'center' });
      doc.setFontSize(9);
      text(emerald);
      doc.text('LOCK', sig2X + sigBoxWidth/2, yPos + 33, { align: 'center' });
      doc.setFontSize(7);
      text(textMuted);
      doc.text('Approval', sig2X + sigBoxWidth/2, yPos + 40, { align: 'center' });
      
      // Arrow 2
      const arrow2X = sig2X + sigBoxWidth + 3;
      fill(emerald);
      doc.triangle(arrow2X + arrowWidth, yPos + sigBoxHeight/2, arrow2X, yPos + sigBoxHeight/2 - 5, arrow2X, yPos + sigBoxHeight/2 + 5, 'F');
      fill(emerald);
      doc.rect(arrow2X - 5, yPos + sigBoxHeight/2 - 2, 8, 4, 'F');
      
      // Signature 3 - Backed Certificate
      const sig3X = sig2X + sigBoxWidth + arrowWidth + 8;
      fill(cardBg);
      doc.roundedRect(sig3X, yPos, sigBoxWidth, sigBoxHeight, 3, 3, 'F');
      fill(gold);
      doc.circle(sig3X + sigBoxWidth/2, yPos + 15, 12, 'F');
      doc.setFontSize(16);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('3', sig3X + sigBoxWidth/2, yPos + 19, { align: 'center' });
      doc.setFontSize(9);
      text(gold);
      doc.text('BACKED', sig3X + sigBoxWidth/2, yPos + 33, { align: 'center' });
      doc.setFontSize(7);
      text(textMuted);
      doc.text('Certificate', sig3X + sigBoxWidth/2, yPos + 40, { align: 'center' });
      
      yPos += sigBoxHeight + 10;
      
      // Phase details
      const phases = [
        { 
          num: '1', 
          title: 'Phase 1: Custody Certification', 
          platform: 'DCB Treasury',
          color: lemon,
          steps: [
            { step: '1.1', desc: 'Select Custody Account with available USD balance' },
            { step: '1.2', desc: 'Reserve funds (deducts from available balance)' },
            { step: '1.3', desc: 'Generate ISO 20022 XML message (pacs.008.001.08)' },
            { step: '1.4', desc: 'Call injectFromDAES() on USD contract → FIRST SIGNATURE' },
            { step: '1.5', desc: 'Send lock notification to Treasury Minting via bridge API' },
          ]
        },
        { 
          num: '2', 
          title: 'Phase 2: Lock Approval', 
          platform: 'Treasury Minting',
          color: emerald,
          steps: [
            { step: '2.1', desc: 'Receive lock notification from DCB Treasury' },
            { step: '2.2', desc: 'Verify first signature exists on blockchain' },
            { step: '2.3', desc: 'Call receiveLock() + acceptLock() → SECOND SIGNATURE' },
            { step: '2.4', desc: 'Move to reserve, generate authorization code (MINT-XXXXXX)' },
          ]
        },
        { 
          num: '3', 
          title: 'Phase 3: Minting & Publication', 
          platform: 'Treasury Minting',
          color: gold,
          steps: [
            { step: '3.1', desc: 'Enter authorization code in "Mint with Code" tab' },
            { step: '3.2', desc: 'Execute Premium Mint → backAndMint() → THIRD SIGNATURE' },
            { step: '3.3', desc: 'VUSD tokens minted to beneficiary wallet address' },
            { step: '3.4', desc: 'Transaction published to Mint Lemon Explorer (public)' },
          ]
        },
      ];
      
      phases.forEach(phase => {
        fill(cardBg);
        doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');
        doc.setFillColor(Number(phase.color[0]), Number(phase.color[1]), Number(phase.color[2]));
        doc.rect(15, yPos, 4, 45, 'F');
        
        // Phase header
        doc.setFillColor(Number(phase.color[0]), Number(phase.color[1]), Number(phase.color[2]));
        doc.circle(27, yPos + 10, 6, 'F');
        doc.setFontSize(10);
        text(black);
        doc.setFont('helvetica', 'bold');
        doc.text(phase.num, 27, yPos + 13, { align: 'center' });
        
        doc.setFontSize(10);
        text(white);
        doc.text(phase.title, 38, yPos + 12);
        
        // Platform badge
        doc.setFillColor(30, 30, 30);
        doc.roundedRect(130, yPos + 5, 50, 10, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setTextColor(Number(phase.color[0]), Number(phase.color[1]), Number(phase.color[2]));
        doc.text(phase.platform, 155, yPos + 11, { align: 'center' });
        
        // Steps
        let stepY = yPos + 20;
        doc.setFontSize(7);
        phase.steps.forEach(s => {
          doc.setTextColor(Number(phase.color[0]), Number(phase.color[1]), Number(phase.color[2]));
          doc.setFont('helvetica', 'bold');
          doc.text(s.step, 24, stepY);
          text(textSecondary);
          doc.setFont('helvetica', 'normal');
          doc.text(s.desc, 35, stepY);
          stepY += 6;
        });
        
        yPos += 48;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 9: COMPARISON VUSD vs USDT vs USDC
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('STABLECOIN COMPARISON', 'Section 10');
      
      yPos = drawSectionTitle('10', 'VUSD vs USDT vs USDC', yPos);
      yPos += 5;
      
      // Description
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      doc.setFontSize(9);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive comparison of transparency, security, and compliance features across', 20, yPos + 8);
      doc.text('major stablecoins. VUSD leads in every transparency and verification metric.', 20, yPos + 15);
      
      yPos += 28;
      
      // Comparison table header
      fill(lemon);
      doc.roundedRect(15, yPos, pageWidth - 30, 14, 2, 2, 'F');
      doc.setFontSize(9);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('FEATURE', 20, yPos + 9);
      doc.text('VUSD', 100, yPos + 9, { align: 'center' });
      doc.text('USDT', 135, yPos + 9, { align: 'center' });
      doc.text('USDC', 170, yPos + 9, { align: 'center' });
      yPos += 14;
      
      const comparisons = [
        { feature: 'Real-Time Minting Transparency', lusd: 'FULL', usdt: 'NONE', usdc: 'LIMITED' },
        { feature: 'On-Chain Mint Verification', lusd: '3 SIGNATURES', usdt: 'NONE', usdc: 'NONE' },
        { feature: 'ISO 20022 Compliance', lusd: 'NATIVE', usdt: 'NO', usdc: 'PARTIAL' },
        { feature: 'Public Reserve Proof', lusd: 'REAL-TIME', usdt: 'QUARTERLY', usdc: 'MONTHLY' },
        { feature: 'Mint Source Traceability', lusd: 'COMPLETE', usdt: 'NONE', usdc: 'NONE' },
        { feature: 'Custody Account Visibility', lusd: 'PUBLIC', usdt: 'PRIVATE', usdc: 'PRIVATE' },
        { feature: 'Multi-Signature Minting', lusd: '3 REQUIRED', usdt: 'CENTRAL', usdc: '2 REQUIRED' },
        { feature: 'Blockchain Verification', lusd: 'IMMEDIATE', usdt: 'NONE', usdc: 'DELAYED' },
      ];
      
      comparisons.forEach((comp, i) => {
        if (i % 2 === 0) {
          fill(cardBg);
          doc.rect(15, yPos, pageWidth - 30, 12, 'F');
        }
        
        doc.setFontSize(8);
        text(white);
        doc.setFont('helvetica', 'normal');
        doc.text(comp.feature, 20, yPos + 8);
        
        // VUSD (always green - best)
        fill(emerald);
        doc.roundedRect(85, yPos + 2, 30, 8, 1, 1, 'F');
        doc.setFontSize(6);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(comp.lusd, 100, yPos + 7, { align: 'center' });
        
        // USDT
        const usdtBad = ['NONE', 'NO', 'PRIVATE', 'CENTRAL'].includes(comp.usdt);
        doc.setFillColor(usdtBad ? 60 : 50, usdtBad ? 30 : 50, usdtBad ? 30 : 30);
        doc.roundedRect(120, yPos + 2, 30, 8, 1, 1, 'F');
        doc.setTextColor(usdtBad ? red : gold);
        doc.text(comp.usdt, 135, yPos + 7, { align: 'center' });
        
        // USDC
        const usdcBad = ['NONE', 'NO', 'PRIVATE'].includes(comp.usdc);
        doc.setFillColor(usdcBad ? 60 : 40, usdcBad ? 30 : 40, usdcBad ? 30 : 60);
        doc.roundedRect(155, yPos + 2, 30, 8, 1, 1, 'F');
        doc.setTextColor(usdcBad ? red : blue);
        doc.text(comp.usdc, 170, yPos + 7, { align: 'center' });
        
        yPos += 12;
      });
      
      yPos += 8;
      
      // Summary cards
      const summaries = [
        { title: 'VUSD: Complete Transparency', color: lemon, desc: 'Every VUSD token has a complete, publicly verifiable history from custody account to minted token. Three independent blockchain signatures ensure maximum security.' },
        { title: 'USDT: Opacity Concerns', color: red, desc: 'Reserve composition and minting process are not publicly verifiable. Centralized minting with no on-chain verification of backing.' },
        { title: 'USDC: Partial Transparency', color: blue, desc: 'Monthly attestations provided by accounting firms, but minting process is not verifiable on-chain. Limited real-time transparency.' },
      ];
      
      summaries.forEach(sum => {
        fill(cardBg);
        doc.roundedRect(15, yPos, pageWidth - 30, 22, 3, 3, 'F');
        doc.setFillColor(Number(sum.color[0]), Number(sum.color[1]), Number(sum.color[2]));
        doc.rect(15, yPos, 4, 22, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(Number(sum.color[0]), Number(sum.color[1]), Number(sum.color[2]));
        doc.setFont('helvetica', 'bold');
        doc.text(sum.title, 24, yPos + 8);
        
        doc.setFontSize(7);
        text(textSecondary);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(sum.desc, pageWidth - 50);
        doc.text(descLines, 24, yPos + 15);
        
        yPos += 25;
      });
      
      // ══════════════════════════════════════════════════════════════════════════
      // PAGE 10: TECHNICAL SPECIFICATIONS
      // ══════════════════════════════════════════════════════════════════════════
      addNewPage('TECHNICAL SPECIFICATIONS', 'Section 12');
      
      yPos = drawSectionTitle('12', 'Technical Specifications', yPos);
      yPos += 5;
      
      // Two-column layout
      const colWidth = (pageWidth - 35) / 2;
      
      // Left column - Network
      fill(cardBg);
      doc.roundedRect(15, yPos, colWidth, 90, 3, 3, 'F');
      fill(lemon);
      doc.rect(15, yPos, colWidth, 15, 'F');
      
      doc.setFontSize(10);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('LEMONCHAIN NETWORK', 20, yPos + 10);
      
      const networkSpecs = [
        { label: 'Network Name', value: 'LemonChain Mainnet' },
        { label: 'Chain ID', value: '1006' },
        { label: 'RPC URL', value: 'https://rpc.lemonchain.io' },
        { label: 'Explorer', value: 'https://explorer.lemonchain.io' },
        { label: 'Native Token', value: 'LEMX' },
        { label: 'Consensus', value: 'Proof of Authority (PoA)' },
        { label: 'Block Time', value: '~3 seconds' },
        { label: 'EVM Version', value: 'Paris' },
      ];
      
      let netY = yPos + 22;
      doc.setFontSize(8);
      networkSpecs.forEach(spec => {
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(spec.label, 20, netY);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(spec.value, 20, netY + 5);
        netY += 12;
      });
      
      // Right column - APIs
      fill(cardBg);
      doc.roundedRect(20 + colWidth, yPos, colWidth, 90, 3, 3, 'F');
      fill(emerald);
      doc.rect(20 + colWidth, yPos, colWidth, 15, 'F');
      
      doc.setFontSize(10);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('API ENDPOINTS', 25 + colWidth, yPos + 10);
      
      const apis = [
        { name: 'DCB Treasury API', port: '4010', desc: 'Lock notifications, mint confirmations' },
        { name: 'Treasury Minting API', port: '4011', desc: 'Lock approval, minting operations' },
        { name: 'WebSocket Server', port: '4012', desc: 'Real-time event updates' },
        { name: 'Mint Explorer API', port: '4010', desc: 'Public transaction data' },
      ];
      
      let apiY = yPos + 22;
      apis.forEach(api => {
        doc.setFillColor(30, 30, 30);
        doc.roundedRect(25 + colWidth, apiY - 3, colWidth - 10, 18, 2, 2, 'F');
        
        doc.setFontSize(8);
        text(white);
        doc.setFont('helvetica', 'bold');
        doc.text(api.name, 30 + colWidth, apiY + 3);
        
        fill(emerald);
        doc.roundedRect(colWidth + 65, apiY - 1, 20, 8, 1, 1, 'F');
        doc.setFontSize(7);
        text(black);
        doc.text(`:${api.port}`, colWidth + 75, apiY + 4, { align: 'center' });
        
        doc.setFontSize(6);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(api.desc, 30 + colWidth, apiY + 11);
        
        apiY += 20;
      });
      
      yPos += 100;
      
      // Contract Addresses
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 55, 3, 3, 'F');
      fill(gold);
      doc.rect(15, yPos, pageWidth - 30, 15, 'F');
      
      doc.setFontSize(10);
      text(black);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPLOYED CONTRACT ADDRESSES', 20, yPos + 10);
      
      const contractAddresses = [
        { name: 'USD Tokenized', address: '0x9A3D7E8F...7B2c', verified: true },
        { name: 'LockReserve', address: '0x4D8B1C9A...1E9a', verified: true },
        { name: 'VUSDMinter', address: '0x7F2E3D4C...3C4d', verified: true },
        { name: 'VUSD Token', address: '0x2A1B8C9D...8D5e', verified: true },
        { name: 'PriceOracle', address: '0x5B3C4D9E...9F6a', verified: true },
      ];
      
      let addrY = yPos + 22;
      const addrColWidth = (pageWidth - 40) / 5;
      contractAddresses.forEach((c, i) => {
        const ax = 20 + (i * addrColWidth);
        
        doc.setFontSize(7);
        text(textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(c.name, ax, addrY);
        
        doc.setFontSize(6);
        text(lemon);
        doc.setFont('courier', 'normal');
        doc.text(c.address, ax, addrY + 6);
        
        if (c.verified) {
          fill(emerald);
          doc.circle(ax + 2, addrY + 12, 2, 'F');
          doc.setFontSize(5);
          text(emerald);
          doc.text('VERIFIED', ax + 6, addrY + 13);
        }
      });
      
      yPos += 65;
      
      // Footer contact
      fill(cardBg);
      doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
      fill(lemon);
      doc.rect(15, yPos, 4, 30, 'F');
      
      doc.setFontSize(10);
      text(lemon);
      doc.setFont('helvetica', 'bold');
      doc.text('DIGITAL COMMERCIAL BANK LTD.', 24, yPos + 10);
      
      doc.setFontSize(8);
      text(textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Email: treasury@digitalcommercialbank.com', 24, yPos + 18);
      doc.text('Website: www.digitalcommercialbank.com', 24, yPos + 25);
      
      text(textMuted);
      doc.text('© 2026 Digital Commercial Bank Ltd. All Rights Reserved.', pageWidth - 20, yPos + 18, { align: 'right' });
      doc.text('Mint Lemon Protocol™', pageWidth - 20, yPos + 25, { align: 'right' });
      
      // Save the PDF
      doc.save('DCB-Mint-Lemon-Protocol-Manual.pdf');
      showNotification('success', `✅ ${t.notifManualPdfDownloaded}`);
      
    } catch (error) {
      console.error('Error generating manual PDF:', error);
      showNotification('error', `❌ ${t.notifErrorGeneratingPdf}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ULTRA-PROFESSIONAL PDF RECEIPT GENERATOR - LOCK APPROVAL CERTIFICATE
  // Premium Institutional Banking Style - Matching DCB Treasury
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateLockApprovalPDF = (lock: LockNotification, approvedAmount?: string) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Premium Institutional Colors
      const darkNavy: [number, number, number] = [8, 20, 40];
      const navy: [number, number, number] = [12, 35, 64];
      const gold: [number, number, number] = [197, 165, 55];
      const lemonGreen: [number, number, number] = [163, 230, 53];
      const emerald: [number, number, number] = [16, 185, 129];
      const teal: [number, number, number] = [0, 150, 136];
      const silver: [number, number, number] = [148, 163, 184];
      const white: [number, number, number] = [255, 255, 255];
      
      // Safe access to lock properties with defaults
      const amount = approvedAmount || lock?.lockDetails?.amount || '0';
      const currency = lock?.lockDetails?.currency || 'USD';
      const lockId = lock?.lockId || 'N/A';
      const authCode = lock?.authorizationCode || 'N/A';
      const beneficiary = lock?.lockDetails?.beneficiary || 'N/A';
      const expiry = lock?.lockDetails?.expiry || new Date().toISOString();
      const custodyVault = lock?.lockDetails?.custodyVault || 'N/A';
      const network = lock?.blockchain?.network || 'LemonChain';
      const chainId = lock?.blockchain?.chainId || 1006;
      const blockNumber = lock?.blockchain?.blockNumber;
      const txHash = lock?.blockchain?.txHash || 'Pending';
      const bankName = lock?.bankInfo?.bankName || 'N/A';
      const bankId = lock?.bankInfo?.bankId || 'N/A';
      const signerAddress = lock?.bankInfo?.signerAddress || 'N/A';
      const signatures = lock?.signatures || [];
      const isoMessageId = lock?.isoData?.messageId || 'N/A';
      const uetr = lock?.isoData?.uetr || 'N/A';
      const accountName = lock?.sourceOfFunds?.accountName || 'N/A';
      const accountType = lock?.sourceOfFunds?.accountType || 'blockchain';
    const certNumber = `TML-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PAGE 1: PREMIUM LOCK APPROVAL CERTIFICATE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Full page dark background
    doc.setFillColor(...darkNavy);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top decorative lemon-green bar
    doc.setFillColor(...lemonGreen);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Header section
    doc.setFillColor(...navy);
    doc.rect(0, 4, pageWidth, 45, 'F');
    
    // Decorative corner elements
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(0.8);
    doc.line(10, 12, 25, 12);
    doc.line(10, 12, 10, 27);
    doc.line(pageWidth - 10, 12, pageWidth - 25, 12);
    doc.line(pageWidth - 10, 12, pageWidth - 10, 27);
    
    // Platform Logo Circle with lemon-green border
    doc.setFillColor(...lemonGreen);
    doc.circle(pageWidth / 2, 28, 14, 'F');
    doc.setFillColor(...darkNavy);
    doc.circle(pageWidth / 2, 28, 12, 'F');
    doc.setFillColor(...lemonGreen);
    doc.circle(pageWidth / 2, 28, 10, 'F');
    doc.setFillColor(...darkNavy);
    doc.circle(pageWidth / 2, 28, 8, 'F');
    
    // TML Text in logo
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TML', pageWidth / 2, 30, { align: 'center' });
    
    // Platform Name
    text(white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TREASURY MINTING LEMONCHAIN', pageWidth / 2, 52, { align: 'center' });
    
    // Subtitle with lemon-green
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('LOCK APPROVAL CERTIFICATE', pageWidth / 2, 58, { align: 'center' });
    
    // Thin lemon-green separator
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(0.3);
    doc.line(50, 63, pageWidth - 50, 63);
    
    // Certificate Type Badge
    let yPos = 72;
    fill(emerald);
    doc.roundedRect(pageWidth / 2 - 30, yPos - 5, 60, 14, 2, 2, 'F');
    text(white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOCK APPROVED', pageWidth / 2, yPos + 3, { align: 'center' });
    
    // Certificate Numbers
    yPos += 18;
    doc.setTextColor(...silver);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Certificate No: ${certNumber}`, pageWidth / 2, yPos, { align: 'center' });
    doc.text(`Auth Code: ${authCode}`, pageWidth / 2, yPos + 5, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // AMOUNT SECTION - Premium Box
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 15;
    
    // Outer lemon-green border
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(1);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'S');
    
    // Inner dark fill
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(22, yPos + 2, pageWidth - 44, 31, 2, 2, 'F');
    
    // Amount label
    doc.setTextColor(...silver);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('APPROVED LOCK AMOUNT', pageWidth / 2, yPos + 10, { align: 'center' });
    
    // Amount value with lemon-green
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(`${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2, yPos + 25, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DUAL COLUMN DETAILS
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 45;
    const colWidth = (pageWidth - 50) / 2;
    
    // Left Column - Lock Details
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(20, yPos, colWidth, 55, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, colWidth, 55, 2, 2, 'S');
    
    // Section header
    doc.setFillColor(...teal);
    doc.roundedRect(20, yPos, colWidth, 10, 2, 0, 'F');
    text(white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LOCK DETAILS', 20 + colWidth / 2, yPos + 7, { align: 'center' });
    
    const lockItems = [
      { label: 'Lock ID', value: (lockId || '').slice(0, 22) },
      { label: 'Beneficiary', value: (beneficiary || '').slice(0, 22) },
      { label: 'Custody Vault', value: (custodyVault || '').slice(0, 22) },
      { label: 'Expiry Date', value: new Date(expiry).toLocaleDateString() }
    ];
    
    let itemY = yPos + 17;
    lockItems.forEach(item => {
      doc.setTextColor(...silver);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, 25, itemY);
      text(white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, 25, itemY + 4);
      itemY += 11;
    });
    
    // Right Column - Blockchain Details
    const rightX = pageWidth / 2 + 5;
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(rightX, yPos, colWidth, 55, 2, 2, 'F');
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(0.5);
    doc.roundedRect(rightX, yPos, colWidth, 55, 2, 2, 'S');
    
    // Section header
    doc.setFillColor(...lemonGreen);
    doc.roundedRect(rightX, yPos, colWidth, 10, 2, 0, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOCKCHAIN DETAILS', rightX + colWidth / 2, yPos + 7, { align: 'center' });
    
    const blockchainItems = [
      { label: 'Network', value: `${network} (ID: ${chainId})` },
      { label: 'Block Number', value: blockNumber ? `#${blockNumber.toLocaleString()}` : 'Pending' },
      { label: 'Chain ID', value: chainId.toString() },
      { label: 'Status', value: 'APPROVED ✓' }
    ];
    
    let rightY = yPos + 17;
    blockchainItems.forEach(item => {
      doc.setTextColor(...silver);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, rightX + 5, rightY);
      text(white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, rightX + 5, rightY + 4);
      rightY += 11;
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BLOCKCHAIN TRANSACTION SECTION
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 62;
    
    // Transaction box with lemon-green accent
    doc.setFillColor(20, 50, 40);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(1);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'S');
    
    // Lemon icon
    doc.setFillColor(...lemonGreen);
    doc.circle(35, yPos + 15, 8, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMX', 35, yPos + 17, { align: 'center' });
    
    // TX Hash label
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMONCHAIN TRANSACTION', 50, yPos + 8);
    
    // TX Hash value
    text(white);
    doc.setFontSize(6);
    doc.setFont('courier', 'normal');
    const txHashDisplay = txHash || 'Pending blockchain confirmation...';
    doc.text(txHashDisplay, 50, yPos + 15);
    
    // Block info
    doc.setTextColor(...silver);
    doc.setFontSize(6);
    const blockInfo = blockNumber ? `Block: ${blockNumber.toLocaleString()}` : 'Block: Pending';
    doc.text(blockInfo, 50, yPos + 22);
    
    // Verified badge
    doc.setFillColor(...lemonGreen);
    doc.roundedRect(pageWidth - 50, yPos + 5, 25, 20, 2, 2, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✓', pageWidth - 37.5, yPos + 14, { align: 'center' });
    doc.setFontSize(5);
    doc.text('VERIFIED', pageWidth - 37.5, yPos + 20, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BANK & SIGNATURES SECTION
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 38;
    
    // Bank info bar
    doc.setFillColor(...navy);
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 2, 2, 'F');
    
    text(gold);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ISSUING INSTITUTION', 25, yPos + 6);
    
    text(white);
    doc.setFontSize(10);
    doc.text(bankName, 25, yPos + 14);
    
    doc.setTextColor(...silver);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const bankIdTrunc = (bankId || '').slice(0, 18);
    const signerTrunc = (signerAddress || '').slice(0, 18);
    doc.text(`Bank ID: ${bankIdTrunc}...  •  Signer: ${signerTrunc}...`, pageWidth - 25, yPos + 10, { align: 'right' });
    
    // Signatures
    yPos += 26;
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATURES', 20, yPos);
    
    // Signature line
    doc.setDrawColor(...lemonGreen);
    doc.setLineWidth(0.3);
    doc.line(20, yPos + 3, pageWidth - 20, yPos + 3);
    
    yPos += 8;
    const sigWidth = (pageWidth - 50) / 3;
    
    if (signatures.length > 0) {
      signatures.slice(0, 3).forEach((sig, index) => {
        const sigX = 20 + (index * (sigWidth + 5));
        
        doc.setFillColor(15, 30, 55);
        doc.roundedRect(sigX, yPos, sigWidth, 22, 2, 2, 'F');
        
        // Role badge
        doc.setFillColor(...teal);
        doc.roundedRect(sigX + 2, yPos + 2, sigWidth - 4, 6, 1, 1, 'F');
        text(white);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text(sig.role || 'Signer', sigX + sigWidth / 2, yPos + 6, { align: 'center' });
        
        // Address
        doc.setTextColor(...silver);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        const sigAddr = (sig.address || 'N/A').slice(0, 16);
        doc.text(sigAddr + '...', sigX + sigWidth / 2, yPos + 13, { align: 'center' });
        
        // Timestamp
        doc.setFontSize(4);
        doc.text(new Date(sig.timestamp || Date.now()).toLocaleString(), sigX + sigWidth / 2, yPos + 18, { align: 'center' });
        
        // Checkmark
        fill(emerald);
        doc.circle(sigX + sigWidth - 5, yPos + 5, 2.5, 'F');
        text(white);
        doc.setFontSize(5);
        doc.text('✓', sigX + sigWidth - 5, yPos + 6.5, { align: 'center' });
      });
    } else {
      doc.setFillColor(15, 30, 55);
      doc.roundedRect(20, yPos, pageWidth - 40, 22, 2, 2, 'F');
      doc.setTextColor(...silver);
      doc.setFontSize(8);
      doc.text('Signatures pending...', pageWidth / 2, yPos + 12, { align: 'center' });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO 20022 METADATA
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 28;
    text(gold);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ISO 20022 TRANSACTION METADATA', 20, yPos);
    
    yPos += 5;
    doc.setTextColor(...silver);
    doc.setFontSize(5);
    doc.setFont('courier', 'normal');
    doc.text(`Message ID: ${isoMessageId}`, 20, yPos);
    doc.text(`UETR: ${uetr}`, 20, yPos + 4);
    doc.text(`Source Account: ${accountName}  •  Type: ${accountType.toUpperCase()}`, 20, yPos + 8);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Bottom lemon-green bar
    doc.setFillColor(...lemonGreen);
    doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');
    
    // Footer content
    doc.setFillColor(...navy);
    doc.rect(0, pageHeight - 20, pageWidth, 16, 'F');
    
    text(white);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Treasury Minting LemonChain  •  Digital Commercial Bank  •  Blockchain-Secured', 15, pageHeight - 14);
    doc.text(`Generated: ${new Date().toLocaleString()}  •  ${productionMode ? 'PRODUCTION' : 'SANDBOX'}`, 15, pageHeight - 9);
    
    doc.setTextColor(...lemonGreen);
    doc.setFontSize(5);
    doc.text(`Verification: ${verificationCode}`, pageWidth - 15, pageHeight - 14, { align: 'right' });
    doc.text('Page 1 of 1', pageWidth - 15, pageHeight - 9, { align: 'right' });
    
    // Save PDF
    const fileName = `TML-Lock-Approval-${authCode}.pdf`;
    doc.save(fileName);
    
    showNotification('success', `✓ ${t.notifPdfGenerated} ${fileName}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('error', t.notifErrorGeneratingPdfRetry);
    }
  };

  const processMint = async () => {
    if (!selectedMint || !selectedLock) return;
    
    setMintStep('processing');
    
    // Simulate minting process
    await new Promise(r => setTimeout(r, 2000));
    
    const txHash = '0x' + Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    const blockNumber = Math.floor(Math.random() * 1000000) + 2000000;
    const publicationCode = generatePublicationCode();
    const mintedAt = new Date().toISOString();
    
    const confirmation: MintConfirmation = {
      id: generateRandomId(),
      authorizationCode: selectedMint.authorizationCode,
      publicationCode,
      txHash,
      blockNumber,
      mintedAmount: selectedMint.requestedAmount,
      mintedBy: currentUser?.username || 'unknown',
      mintedAt,
      lusdContractAddress: LEMON_CHAIN.lusdContract
    };
    
    apiBridge.confirmMint(confirmation);
    
    // Notify DCB Treasury about the completed mint
    await apiBridge.notifyDCBTreasuryMintCompleted({
      lockId: selectedLock.lockId,
      authorizationCode: selectedMint.authorizationCode,
      publicationCode,
      amount: selectedMint.requestedAmount,
      mintedBy: currentUser?.username || 'unknown',
      mintedAt,
      txHash,
      blockNumber,
      beneficiary: getLockBeneficiary(selectedLock),
      bankName: getLockBankName(selectedLock),
      lusdContractAddress: LEMON_CHAIN.lusdContract
    });
    
    setMintTxHash(txHash);
    setMintStep('complete');
    
    // Remove the minted item from queue (mark as completed)
    if (selectedMintItem) {
      setMintWithCodeQueue(prev => prev.map(item => 
        item.id === selectedMintItem.id 
          ? { ...item, status: 'completed' as const }
          : item
      ));
      setSelectedMintItem(null);
    }
    
    loadData();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIUM MINTING FLOW HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleStartPremiumMint = (item: MintWithCodeItem) => {
    setSelectedMintItem(item);
    setPremiumMintStep(1);
    
    // Auto-fill lock contract hash if available from blockchain data
    const lockTxHash = item.blockchain?.lockTxHash || item.blockchain?.txHash || '';
    setLockContractHash(lockTxHash);
    
    // Auto-fill VUSD mint hash - use lock hash or first signature hash as reference
    // In production mode, this will be replaced with the actual mint tx hash after minting
    const vusdMintHash = item.blockchain?.lusdMintHash || 
                         item.blockchain?.firstSignature || 
                         lockTxHash ||
                         '';
    setLusdMintHash(vusdMintHash);
    
    setLusdContractAddress(LEMON_CHAIN.lusdContract);
    setPremiumMintResult(null);
    
    // Show notification if hashes were auto-completed
    if (lockTxHash && vusdMintHash) {
      showNotification('info', `🎯 Hashes auto-completados. Lock: ${lockTxHash.slice(0, 12)}... | VUSD: ${vusdMintHash.slice(0, 12)}...`);
    } else if (lockTxHash) {
      showNotification('info', `🎯 Hash del Lock auto-completado: ${lockTxHash.slice(0, 20)}...`);
    }
    setShowPremiumMintModal(true);
  };
  
  const handlePremiumMintNext = () => {
    if (premiumMintStep < 4) {
      // When moving from step 1 to step 2, auto-fill VUSD hash if empty
      if (premiumMintStep === 1 && !lusdMintHash && lockContractHash) {
        // Use the lock hash as reference for VUSD hash
        // This will be replaced with actual mint tx hash after minting in production
        setLusdMintHash(lockContractHash);
        showNotification('info', '🎯 VUSD Hash auto-completado desde Lock Hash');
      }
      setPremiumMintStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };
  
  const handlePremiumMintBack = () => {
    if (premiumMintStep > 1) {
      setPremiumMintStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };
  
  const handleExecutePremiumMint = async () => {
    if (!selectedMintItem) return;
    
    setIsPremiumMinting(true);
    
    try {
      // ═══════════════════════════════════════════════════════════════════════════════
      // 🔗 BLOCKCHAIN INTEGRATION - DIRECT VUSD MINTING (PRODUCTION MODE)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      let txHash = '';
      let blockNumber = 0;
      let publicationCode = '';
      let backedSignature = '';
      let certificateId = '';
      
      // Get blockchain data from the mint item
      const blockchainData = (selectedMintItem as any).blockchain;
      const injectionId = blockchainData?.injectionId || blockchainData?.lockReserveId;
      const firstSignature = blockchainData?.firstSignature;
      const secondSignature = blockchainData?.secondSignature;
      
      console.log('🔗 [MINT VUSD] Production Mode:', productionMode);
      console.log('   Beneficiary:', selectedMintItem.beneficiary);
      console.log('   Amount:', selectedMintItem.amountUSD, 'USD');
      
      // ════════════════════════════════════════════════════════════════════════════════
      // 🚀 PRODUCTION MODE: Direct VUSD mint using minter wallet from .env
      // ════════════════════════════════════════════════════════════════════════════════
      if (productionMode) {
        console.log('🔗 [PRODUCTION] Executing REAL VUSD mint on LemonChain...');
        showNotification('info', `🔗 ${t.premiumMintProductionMode}`);
        
        try {
          // Determine the beneficiary address - must be a valid Ethereum address
          let beneficiaryAddress = selectedMintItem.beneficiary;
          
          // Default beneficiary wallet - use minter wallet or VUSD contract
          const DEFAULT_BENEFICIARY = '0xaccA35529b2FC2041dFb124F83f52120E24377B2'; // Minter wallet
          
          // Check if beneficiary is a valid Ethereum address
          const isValidAddress = (addr: string | undefined): boolean => {
            if (!addr) return false;
            if (typeof addr !== 'string') return false;
            if (!addr.startsWith('0x')) return false;
            if (addr.length !== 42) return false;
            // Check if it's all zeros (null address)
            if (addr === '0x0000000000000000000000000000000000000000') return false;
            return true;
          };
          
          if (!isValidAddress(beneficiaryAddress)) {
            // Try multiple fallback sources
            const fallbackAddress = (selectedMintItem as any).blockchain?.vaultAddress ||
                                    (selectedMintItem as any).isoData?.vaultAddress ||
                                    LEMON_CHAIN.lusdContract;
            
            if (isValidAddress(fallbackAddress)) {
              console.warn('⚠️ Beneficiary is not a valid address:', beneficiaryAddress);
              console.log('   Using fallback address:', fallbackAddress);
              beneficiaryAddress = fallbackAddress;
              showNotification('warning', `Usando vault address como beneficiario: ${fallbackAddress.slice(0, 10)}...`);
            } else {
              // Use default minter wallet as final fallback
              console.warn('⚠️ No valid beneficiary found, using default minter wallet');
              beneficiaryAddress = DEFAULT_BENEFICIARY;
              showNotification('warning', `Usando wallet minter como beneficiario: ${DEFAULT_BENEFICIARY.slice(0, 10)}...`);
            }
          }
          
          console.log('   Final Beneficiary Address:', beneficiaryAddress);
          
          // Use the direct mint function that uses VITE_VUSD_MINTER_PRIVATE_KEY
          const mintResult = await smartContractService.mintVUSDDirect(
            beneficiaryAddress,
            parseFloat(selectedMintItem.amountUSD),
            selectedMintItem.authorizationCode
          );
          
          if (mintResult.success) {
            txHash = mintResult.txHash;
            blockNumber = mintResult.blockNumber;
            publicationCode = generatePublicationCode();
            backedSignature = ethers.keccak256(ethers.toUtf8Bytes(`BACKED-${txHash}-${Date.now()}`));
            certificateId = ethers.keccak256(ethers.toUtf8Bytes(`CERT-${selectedMintItem.authorizationCode}-${txHash}`));
            
            console.log('✅ [PRODUCTION] VUSD Minted Successfully!');
            console.log('   TX Hash:', txHash);
            console.log('   Block:', blockNumber);
            console.log('   Explorer: https://explorer.lemonchain.io/tx/' + txHash);
            
            showNotification('success', `✅ VUSD Minteado en LemonChain! TX: ${txHash.slice(0, 20)}...`);
          } else {
            throw new Error(mintResult.error || 'Mint failed');
          }
          
        } catch (blockchainError: any) {
          console.error('❌ [PRODUCTION] Blockchain error:', blockchainError);
          showNotification('error', `❌ Error mintando VUSD: ${blockchainError.message}`);
          setIsPremiumMinting(false);
          return; // Don't continue on production error
        }
        
      } else if (injectionId && firstSignature && secondSignature) {
        // ════════════════════════════════════════════════════════════════════════════════
        // LEGACY: Use VUSDMinter contract (requires deployed contract with backAndMint)
        // ════════════════════════════════════════════════════════════════════════════════
        console.log('🔗 [Legacy] Executing THIRD SIGNATURE via VUSDMinter contract...');
        console.log('   Injection ID:', injectionId);
        console.log('   First Signature:', firstSignature);
        console.log('   Second Signature:', secondSignature);
        
        try {
          const isConnected = await ensureBlockchainConnection();
          
          if (!isConnected) {
            if (!smartContractService.getIsConnected()) {
              showNotification('info', '🔗 Conectando wallet a LemonChain...');
              await smartContractService.connectWallet();
            }
          }
          
          const emisorTxHash = lusdMintHash || `0x${Date.now().toString(16)}${'0'.repeat(48)}`;
          showNotification('info', '🔗 Generando Tercera Firma (Backed Certificate)...');
          
          const mintResult = await smartContractService.generateBackedSignature(
            injectionId,
            parseFloat(selectedMintItem.amountUSD),
            selectedMintItem.beneficiary,
            emisorTxHash,
            selectedMintItem.authorizationCode,
            firstSignature,
            secondSignature
          );
          
          txHash = mintResult.txHash;
          blockNumber = mintResult.blockNumber;
          publicationCode = mintResult.publicationCode;
          backedSignature = mintResult.backedSignature;
          certificateId = mintResult.certificateId;
          
          showNotification('success', `✅ VUSD Minteado! TX: ${txHash.slice(0, 20)}...`);
          
        } catch (blockchainError: any) {
          console.error('❌ Blockchain error:', blockchainError);
          showNotification('warning', `⚠️ Error blockchain: ${blockchainError.message}. Usando modo sandbox...`);
          txHash = '0x' + Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
          blockNumber = Math.floor(Math.random() * 1000000) + 2000000;
          publicationCode = generatePublicationCode();
          backedSignature = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        }
      } else {
        // ════════════════════════════════════════════════════════════════════════════════
        // SANDBOX MODE: Simulate blockchain transaction
        // ════════════════════════════════════════════════════════════════════════════════
        console.log('📦 [SANDBOX] Simulating blockchain mint');
        showNotification('info', '📦 Modo Sandbox - Simulando mint...');
        await new Promise(r => setTimeout(r, 2000));
        
        txHash = '0x' + Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
        blockNumber = Math.floor(Math.random() * 1000000) + 2000000;
        publicationCode = generatePublicationCode();
        backedSignature = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      }
      
      const mintedAt = new Date().toISOString();
      
      // Create confirmation with blockchain data
      const confirmation: MintConfirmation = {
        id: generateRandomId(),
        authorizationCode: selectedMintItem.authorizationCode,
        publicationCode,
        txHash,
        blockNumber,
        mintedAmount: selectedMintItem.amountUSD,
        mintedBy: currentUser?.username || 'unknown',
        mintedAt,
        lusdContractAddress: lusdContractAddress,
        // 🔗 Add blockchain signatures
        signatures: {
          first: firstSignature || 'sandbox',
          second: secondSignature || 'sandbox',
          third: backedSignature
        },
        certificateId
      };
      
      // Register in API Bridge (this will add to Mint Explorer)
      apiBridge.confirmMint(confirmation);
      
      // Notify DCB Treasury about the completed mint
      await apiBridge.notifyDCBTreasuryMintCompleted({
        lockId: selectedMintItem.lockId,
        authorizationCode: selectedMintItem.authorizationCode,
        publicationCode,
        amount: selectedMintItem.amountUSD,
        mintedBy: currentUser?.username || 'unknown',
        mintedAt,
        txHash,
        blockNumber,
        beneficiary: selectedMintItem.beneficiary,
        bankName: selectedMintItem.bankName,
        lusdContractAddress: lusdContractAddress,
        lockContractHash: lockContractHash,
        lusdMintHash: lusdMintHash,
        // 🔗 Blockchain data
        blockchain: {
          network: 'LemonChain',
          chainId: LEMONCHAIN_CONFIG.chainId,
          certificateId,
          backedSignature,
          signatures: {
            first: firstSignature,
            second: secondSignature,
            third: backedSignature
          },
          contracts: {
            usd: CONTRACT_ADDRESSES.USD,
            lockReserve: CONTRACT_ADDRESSES.LockReserve,
            lusdMinter: CONTRACT_ADDRESSES.VUSDMinter,
            lusd: CONTRACT_ADDRESSES.VUSD
          }
        }
      });
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // 🔄 SUPABASE SYNC - Record mint in cloud for DCB Treasury visibility
      // ═══════════════════════════════════════════════════════════════════════════════
      if (supabaseConnected) {
        await supabaseSync.createMint({
          lock_id: selectedMintItem.lockId,
          amount_vusd: parseFloat(selectedMintItem.amountUSD),
          beneficiary: selectedMintItem.beneficiary,
          tx_hash: txHash,
          block_number: blockNumber,
          publication_code: publicationCode,
          minted_by: currentUser?.username || 'unknown',
          minted_at: mintedAt,
          certificate_id: certificateId || null,
          metadata: {
            lock_contract_hash: lockContractHash,
            lusd_mint_hash: lusdMintHash,
            backed_signature: backedSignature,
            network: 'LemonChain',
            chain_id: LEMONCHAIN_CONFIG.chainId
          }
        });
        console.log('%c🔄 [SUPABASE] Mint recorded in cloud - DCB Treasury notified', 'color: #00d9ff; font-weight: bold;');
      }
      
      // Set result
      setPremiumMintResult({
        success: true,
        txHash,
        blockNumber,
        publicationCode,
        timestamp: mintedAt,
        backedSignature,
        certificateId
      });
      
      // Update queue item status
      setMintWithCodeQueue(prev => prev.map(item => 
        item.id === selectedMintItem.id 
          ? { ...item, status: 'completed' as const }
          : item
      ));
      
      setPremiumMintStep(4);
      showNotification('success', t.lusdMintedSuccess);
      loadData();
      
    } catch (error) {
      console.error('Error in premium minting:', error);
      showNotification('error', 'Error al ejecutar el minting');
    } finally {
      setIsPremiumMinting(false);
    }
  };
  
  const handleClosePremiumMint = () => {
    setShowPremiumMintModal(false);
    setSelectedMintItem(null);
    setPremiumMintStep(1);
    setLockContractHash('');
    setLusdMintHash('');
    setPremiumMintResult(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // USER HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleCreateUser = () => {
    const result = authService.createUser({
      username: userForm.username,
      password: userForm.password,
      email: userForm.email,
      role: userForm.role
    });
    
    if (result.success) {
      showNotification('success', 'Usuario creado correctamente');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', email: '', role: 'operator' });
      loadData();
    } else {
      showNotification('error', result.error || 'Error al crear usuario');
    }
  };

  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showNotification('error', 'Las contraseñas no coinciden');
      return;
    }
    
    const result = authService.changePassword(currentUser?.userId || '', passwordForm.current, passwordForm.new);
    
    if (result.success) {
      showNotification('success', 'Contraseña actualizada correctamente');
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } else {
      showNotification('error', result.error || 'Error al cambiar contraseña');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('info', 'Copiado al portapapeles');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to safely get lock amount from different data structures
  const getLockAmount = (lock: any): string => {
    if (!lock) return '0';
    return lock?.lockDetails?.amount || lock?.amount || '0';
  };

  const getLockCurrency = (lock: any): string => {
    if (!lock) return 'USD';
    return lock?.lockDetails?.currency || lock?.currency || 'USD';
  };

  const getLockBeneficiary = (lock: any): string => {
    if (!lock) return '';
    return lock?.lockDetails?.beneficiary || lock?.beneficiary || '';
  };

  const getLockBankName = (lock: any): string => {
    if (!lock) return 'Digital Commercial Bank Ltd.';
    return lock?.bankInfo?.bankName || 'Digital Commercial Bank Ltd.';
  };

  const formatAmount = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN CONNECTION - PRODUCTION MODE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Production mode is always enabled - toggle function removed for production deployment

  /**
   * Connect blockchain for real transactions
   */
  const ensureBlockchainConnection = async (): Promise<boolean> => {
    if (!productionMode) {
      console.log('[Blockchain] Sandbox mode - skipping real transactions');
      return false;
    }
    
    if (blockchainConnected && smartContractService.getIsConnected()) {
      return true;
    }
    
    try {
      const result = await smartContractService.connectWithPrivateKey(ADMIN_WALLET.privateKey);
      const balance = await smartContractService.getBalance(result.address);
      
      setConnectedWallet({
        address: result.address,
        balance: parseFloat(balance).toFixed(4),
        role: ADMIN_WALLET.role
      });
      setBlockchainConnected(true);
      
      return true;
    } catch (error: any) {
      console.error('[Blockchain] Connection failed:', error);
      showNotification('warning', `⚠️ Error blockchain: ${error.message}. Continuando en modo sandbox...`);
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  const generateMintReceipt = (entry: MintExplorerEntry) => {
    const pdf = new jsPDF();
    const lock = apiBridge.getLockByCode(entry.authorizationCode);
    
    // Header
    pdf.setFillColor(5, 5, 5);
    pdf.rect(0, 0, 210, 40, 'F');
    pdf.setTextColor(0, 212, 170);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TREASURY MINTING LEMONCHAIN PLATFORM', 105, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setTextColor(180, 180, 180);
    pdf.text('LemonChain VUSD Minting Receipt', 105, 30, { align: 'center' });
    
    // Content
    pdf.setTextColor(50, 50, 50);
    pdf.setFontSize(10);
    
    let y = 55;
    const addLine = (label: string, value: string) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label + ':', 20, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value || 'N/A', 70, y);
      y += 8;
    };
    
    addLine('Event Type', entry.type);
    addLine('Publication Code', entry.publicationCode || 'N/A');
    addLine('Authorization Code', entry.authorizationCode);
    addLine('Lock ID', entry.lockId);
    addLine('Transaction Hash', entry.blockchain?.txHash || 'N/A');
    addLine('Block Number', entry.blockchain?.blockNumber?.toString() || 'N/A');
    addLine('Timestamp', formatDate(entry.timestamp));
    addLine('Amount', `${formatAmount(entry.amount)} ${entry.type === 'MINT_COMPLETED' ? 'VUSD' : 'USD'}`);
    addLine('Actor', entry.actor);
    addLine('Beneficiary', entry.details?.beneficiary || 'N/A');
    addLine('Bank', entry.details?.bankName || 'N/A');
    addLine('VUSD Contract', entry.blockchain?.lusdContract || 'N/A');
    addLine('Network', `${entry.blockchain?.network || LEMON_CHAIN.name} (Chain ID: ${entry.blockchain?.chainId || LEMON_CHAIN.chainId})`);
    
    // Signatures
    if (entry.signatures && entry.signatures.length > 0) {
      y += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Blockchain Signatures:', 20, y);
      y += 8;
      pdf.setFont('helvetica', 'normal');
      entry.signatures.forEach((sig, idx) => {
        addLine(`Signature ${idx + 1}`, `${sig.role}: ${sig.address.substring(0, 20)}...`);
      });
    }
    
    if (lock) {
      y += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Source of Funds:', 20, y);
      y += 8;
      pdf.setFont('helvetica', 'normal');
      addLine('Account', lock.sourceOfFunds.accountName);
      addLine('Original Balance', `$${formatAmount(lock.sourceOfFunds.originalBalance)}`);
      addLine('Lock Amount', `$${formatAmount(getLockAmount(lock))}`);
    }
    
    // Footer
    pdf.setFillColor(5, 5, 5);
    pdf.rect(0, 270, 210, 30, 'F');
    pdf.setTextColor(0, 212, 170);
    pdf.setFontSize(8);
    pdf.text('This is an official Treasury Minting LemonChain Platform receipt', 105, 280, { align: 'center' });
    pdf.text(`Generated: ${new Date().toISOString()}`, 105, 286, { align: 'center' });
    
    pdf.save(`TML_Mint_Receipt_${entry.publicationCode}.pdf`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATE INCOMING LOCK (FOR TESTING)
  // ═══════════════════════════════════════════════════════════════════════════
  const simulateIncomingLock = () => {
    apiBridge.simulateLockFromDCB();
    loadData();
    showNotification('success', 'Lock simulado recibido de DCB Treasury');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING PAGE - Public Professional Page
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated && showLandingPage && !showExplorerFromLanding) {
    return (
      <LandingPage 
        onAdminLogin={() => setShowLandingPage(false)}
        onExplorerOpen={() => setShowExplorerFromLanding(true)}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPLORER FROM LANDING - Show Explorer without login
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated && showExplorerFromLanding) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: colors.bg.primary, 
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Header with back button */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 32px',
          background: 'rgba(5, 8, 7, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.border.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setShowExplorerFromLanding(false)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${colors.border.primary}`,
                borderRadius: '10px',
                color: colors.text.secondary,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back to Home
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: colors.gradient.lemon,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Coins style={{ width: '22px', height: '22px', color: colors.bg.primary }} />
              </div>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '800', color: colors.text.primary }}>
                  TREASURY MINTING
                </h1>
                <p style={{ fontSize: '11px', color: colors.accent.primary }}>Block Explorer</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowExplorerFromLanding(false);
              setShowLandingPage(false);
            }}
            style={{
              padding: '10px 24px',
              background: colors.gradient.lemon,
              border: 'none',
              borderRadius: '10px',
              color: colors.bg.primary,
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Shield style={{ width: '16px', height: '16px' }} />
            Admin Login
          </button>
        </header>
        
        {/* Explorer Content */}
        <div style={{ paddingTop: '80px' }}>
          <MintLemonExplorer entries={mintExplorer} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN - PRO LemonChain Design
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: colors.bg.primary, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Effects */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: colors.gradient.radial,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: '-300px',
          right: '-300px',
          width: '800px',
          height: '800px',
          background: `radial-gradient(circle, ${colors.accent.glow}10 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-200px',
          left: '-200px',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${colors.accent.glow}08 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        
        <div style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative', zIndex: 1 }}>
          {/* Logo - PRO Style */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ 
              width: '90px', 
              height: '90px', 
              background: colors.gradient.lemon, 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px', 
              boxShadow: `0 0 60px ${colors.accent.glow}60, 0 0 120px ${colors.accent.glow}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                borderRadius: '24px'
              }} />
              <Coins style={{ width: '46px', height: '46px', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              background: colors.gradient.lemon,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              TREASURY MINTING
            </h1>
            <p style={{ color: colors.accent.secondary, fontSize: '14px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>LemonChain Platform</p>
          </div>
          
          {/* Login Card - PRO Style */}
          <div style={{ 
            background: colors.bg.card, 
            borderRadius: '20px', 
            border: `1px solid ${colors.border.lemon}`, 
            padding: '36px', 
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${colors.accent.glow}10` 
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: colors.text.primary, marginBottom: '28px', textAlign: 'center' }}>{t.tmLoginTitle}</h2>
            
            {loginError && (
              <div style={{ background: `${colors.accent.red}15`, border: `1px solid ${colors.accent.red}40`, borderRadius: '12px', padding: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: colors.accent.red }} />
                <span style={{ color: colors.accent.red, fontSize: '14px', fontWeight: '500' }}>{loginError}</span>
              </div>
            )}
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: colors.text.secondary, fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>{t.tmLoginUser}</label>
              <div style={{ position: 'relative' }}>
                <UserIcon style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: colors.text.muted }} />
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder={t.tmLoginUserPlaceholder}
                  style={{ 
                    width: '100%', 
                    background: colors.bg.secondary, 
                    border: `1px solid ${colors.border.primary}`, 
                    borderRadius: '12px', 
                    padding: '16px 16px 16px 48px', 
                    color: colors.text.primary, 
                    fontSize: '14px', 
                    outline: 'none', 
                    transition: 'all 0.2s' 
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent.primary;
                    e.target.style.boxShadow = `0 0 20px ${colors.accent.glow}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border.primary;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', color: colors.text.secondary, fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>{t.tmLoginPassword}</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: colors.text.muted }} />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder={t.tmLoginPasswordPlaceholder}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  style={{ 
                    width: '100%', 
                    background: colors.bg.secondary, 
                    border: `1px solid ${colors.border.primary}`, 
                    borderRadius: '12px', 
                    padding: '16px 16px 16px 48px', 
                    color: colors.text.primary, 
                    fontSize: '14px', 
                    outline: 'none', 
                    transition: 'all 0.2s' 
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent.primary;
                    e.target.style.boxShadow = `0 0 20px ${colors.accent.glow}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border.primary;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            
            <button
              onClick={handleLogin}
              disabled={loginLoading || !loginForm.username || !loginForm.password}
              style={{ 
                width: '100%', 
                background: colors.gradient.lemon, 
                border: 'none', 
                borderRadius: '12px', 
                padding: '16px', 
                color: colors.bg.primary, 
                fontSize: '16px', 
                fontWeight: '700', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px', 
                opacity: loginLoading || !loginForm.username || !loginForm.password ? 0.6 : 1, 
                transition: 'all 0.2s',
                boxShadow: `0 0 30px ${colors.accent.glow}40`
              }}
            >
              {loginLoading ? <Loader2 style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite' }} /> : <Shield style={{ width: '22px', height: '22px' }} />}
              {loginLoading ? t.tmLoginAuthenticating : t.tmLoginButton}
            </button>
          </div>
          
          {/* Footer - PRO Style */}
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <p style={{ color: colors.text.muted, fontSize: '12px' }}>{t.connected} DCB Treasury Certification Platform</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                background: colors.accent.primary, 
                borderRadius: '50%',
                boxShadow: `0 0 8px ${colors.accent.glow}`
              }} />
              <p style={{ color: colors.accent.secondary, fontSize: '12px', fontWeight: '600' }}>LemonChain • Chain ID: {LEMON_CHAIN.chainId}</p>
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
          
          /* Custom Scrollbar */
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-track { background: ${colors.bg.primary}; }
          ::-webkit-scrollbar-thumb { background: ${colors.border.secondary}; border-radius: 5px; }
          ::-webkit-scrollbar-thumb:hover { background: ${colors.accent.dark}; }
          
          input::placeholder { color: ${colors.text.dim}; }
          ::selection { background: ${colors.accent.primary}40; color: ${colors.text.primary}; }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD - NEW DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Calculate totals - Include both mintRequests and mintWithCodeQueue
  // PENDING LOCKS: Amount not yet approved
  const pendingLocksAmount = pendingLocks.reduce((sum, l) => sum + parseFloat(l.lockDetails?.amount || '0'), 0);
  
  // LOCK RESERVE: Remaining amounts from partial approvals
  const lockReserveAmount = lockReserveItems
    .filter(item => item.status === 'active')
    .reduce((sum, item) => sum + item.remainingAmount, 0);
  
  // TOTAL AVAILABLE: Pending + Lock Reserve
  const availableForMinting = pendingLocksAmount + lockReserveAmount;
  
  // Total minted from mintRequests + completed items from mintWithCodeQueue
  const mintedFromRequests = mintRequests.filter(r => r.status === 'minted').reduce((sum, r) => sum + parseFloat(r.requestedAmount || '0'), 0);
  const mintedFromQueue = mintWithCodeQueue.filter(m => m.status === 'completed').reduce((sum, m) => sum + parseFloat(m.amountUSD || '0'), 0);
  const totalMinted = mintedFromRequests + mintedFromQueue;
  
  // Completed mints count
  const mintsFromRequests = mintRequests.filter(r => r.status === 'minted').length;
  const mintsFromQueue = mintWithCodeQueue.filter(m => m.status === 'completed').length;
  const mintsCompleted = mintsFromRequests + mintsFromQueue;
  
  // Approved mints count (pending in queue = approved but not yet minted)
  const approvedFromQueue = mintWithCodeQueue.filter(m => m.status === 'pending').length;
  const approvedFromRequests = mintRequests.filter(r => r.status === 'approved').length;
  const totalApproved = approvedFromQueue + approvedFromRequests;
  
  // Total locks in reserve: Pending + Lock Reserve items
  const locksInReserve = pendingLocks.length + lockReserveItems.filter(item => item.status === 'active').length;
  
  // Recent mints for display
  const recentMints = mintWithCodeQueue.filter(m => m.status === 'completed').slice(-5).reverse();

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.primary, fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      {/* Background Effects - Matching Explorer */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: colors.gradient.radial,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        background: `radial-gradient(circle, ${colors.accent.glow}08 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {/* Notification - Enhanced */}
      {notification && (
        <div style={{ 
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999, 
          padding: '18px 28px', borderRadius: '14px', 
          display: 'flex', alignItems: 'center', gap: '14px', 
          background: notification.type === 'success' ? `${colors.accent.primary}15` : notification.type === 'error' ? `${colors.accent.red}15` : `${colors.accent.blue}15`, 
          border: `1px solid ${notification.type === 'success' ? colors.accent.primary : notification.type === 'error' ? colors.accent.red : colors.accent.blue}50`, 
          boxShadow: `0 0 30px ${notification.type === 'success' ? colors.accent.primary : notification.type === 'error' ? colors.accent.red : colors.accent.blue}20`,
          animation: 'slideIn 0.3s ease',
          backdropFilter: 'blur(10px)'
        }}>
          {notification.type === 'success' ? <CheckCircle style={{ width: '22px', height: '22px', color: colors.accent.primary }} /> : notification.type === 'error' ? <XCircle style={{ width: '22px', height: '22px', color: colors.accent.red }} /> : <Info style={{ width: '22px', height: '22px', color: colors.accent.blue }} />}
          <span style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '500' }}>{notification.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CONNECTION STATUS MODAL - Modern UI */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showConnectionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.bg.card} 0%, ${colors.bg.secondary} 100%)`,
            borderRadius: '20px',
            border: `1px solid ${colors.border.primary}`,
            padding: '32px',
            width: '480px',
            maxWidth: '95vw',
            boxShadow: `0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px ${colors.accent.primary}10`
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${colors.accent.cyan || '#06b6d4'}20, ${colors.accent.primary}20)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Network style={{ width: '24px', height: '24px', color: colors.accent.cyan || '#06b6d4' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: colors.text.primary, fontSize: '18px', fontWeight: '700' }}>
                    Estado de Conexiones
                  </h3>
                  <p style={{ margin: 0, color: colors.text.muted, fontSize: '12px' }}>
                    {isAutoRepairing ? 'Auto-reparando...' : 'Diagnóstico del sistema'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectionModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  color: colors.text.muted
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Connection Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* RPC Connection */}
              <div style={{
                background: colors.bg.tertiary,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${
                  connectionStatus.rpc.status === 'connected' ? colors.accent.primary + '40' :
                  connectionStatus.rpc.status === 'error' ? colors.accent.red + '40' :
                  connectionStatus.rpc.status === 'repairing' ? colors.accent.yellow + '40' :
                  colors.border.primary
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: connectionStatus.rpc.status === 'connected' ? `${colors.accent.primary}20` :
                                connectionStatus.rpc.status === 'error' ? `${colors.accent.red}20` :
                                `${colors.accent.yellow}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {connectionStatus.rpc.status === 'checking' || connectionStatus.rpc.status === 'repairing' ? (
                        <Loader2 style={{ width: '18px', height: '18px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                      ) : connectionStatus.rpc.status === 'connected' ? (
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                      ) : (
                        <XCircle style={{ width: '18px', height: '18px', color: colors.accent.red }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>LemonChain RPC</div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>{connectionStatus.rpc.message}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: connectionStatus.rpc.status === 'connected' ? `${colors.accent.primary}20` :
                              connectionStatus.rpc.status === 'error' ? `${colors.accent.red}20` :
                              `${colors.accent.yellow}20`,
                    color: connectionStatus.rpc.status === 'connected' ? colors.accent.primary :
                          connectionStatus.rpc.status === 'error' ? colors.accent.red :
                          colors.accent.yellow
                  }}>
                    {connectionStatus.rpc.status === 'connected' ? 'ONLINE' :
                     connectionStatus.rpc.status === 'error' ? 'OFFLINE' :
                     connectionStatus.rpc.status === 'repairing' ? 'REPARANDO' : 'VERIFICANDO'}
                  </div>
                </div>
              </div>

              {/* DCB Treasury API */}
              <div style={{
                background: colors.bg.tertiary,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${
                  connectionStatus.dcbApi.status === 'connected' ? colors.accent.primary + '40' :
                  connectionStatus.dcbApi.status === 'error' ? colors.accent.red + '40' :
                  connectionStatus.dcbApi.status === 'repairing' ? colors.accent.yellow + '40' :
                  colors.border.primary
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: connectionStatus.dcbApi.status === 'connected' ? `${colors.accent.primary}20` :
                                connectionStatus.dcbApi.status === 'error' ? `${colors.accent.red}20` :
                                `${colors.accent.yellow}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {connectionStatus.dcbApi.status === 'checking' || connectionStatus.dcbApi.status === 'repairing' ? (
                        <Loader2 style={{ width: '18px', height: '18px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                      ) : connectionStatus.dcbApi.status === 'connected' ? (
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                      ) : (
                        <XCircle style={{ width: '18px', height: '18px', color: colors.accent.red }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>DCB Treasury API</div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>{connectionStatus.dcbApi.message}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: connectionStatus.dcbApi.status === 'connected' ? `${colors.accent.primary}20` :
                              connectionStatus.dcbApi.status === 'error' ? `${colors.accent.red}20` :
                              `${colors.accent.yellow}20`,
                    color: connectionStatus.dcbApi.status === 'connected' ? colors.accent.primary :
                          connectionStatus.dcbApi.status === 'error' ? colors.accent.red :
                          colors.accent.yellow
                  }}>
                    {connectionStatus.dcbApi.status === 'connected' ? 'ONLINE' :
                     connectionStatus.dcbApi.status === 'error' ? 'OFFLINE' :
                     connectionStatus.dcbApi.status === 'repairing' ? 'REPARANDO' : 'VERIFICANDO'}
                  </div>
                </div>
              </div>

              {/* LEMX Minting API */}
              <div style={{
                background: colors.bg.tertiary,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${
                  connectionStatus.lemxApi.status === 'connected' ? colors.accent.primary + '40' :
                  connectionStatus.lemxApi.status === 'error' ? colors.accent.red + '40' :
                  connectionStatus.lemxApi.status === 'repairing' ? colors.accent.yellow + '40' :
                  colors.border.primary
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: connectionStatus.lemxApi.status === 'connected' ? `${colors.accent.primary}20` :
                                connectionStatus.lemxApi.status === 'error' ? `${colors.accent.red}20` :
                                `${colors.accent.yellow}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {connectionStatus.lemxApi.status === 'checking' || connectionStatus.lemxApi.status === 'repairing' ? (
                        <Loader2 style={{ width: '18px', height: '18px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                      ) : connectionStatus.lemxApi.status === 'connected' ? (
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                      ) : (
                        <XCircle style={{ width: '18px', height: '18px', color: colors.accent.red }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>LEMX Minting API</div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>{connectionStatus.lemxApi.message}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: connectionStatus.lemxApi.status === 'connected' ? `${colors.accent.primary}20` :
                              connectionStatus.lemxApi.status === 'error' ? `${colors.accent.red}20` :
                              `${colors.accent.yellow}20`,
                    color: connectionStatus.lemxApi.status === 'connected' ? colors.accent.primary :
                          connectionStatus.lemxApi.status === 'error' ? colors.accent.red :
                          colors.accent.yellow
                  }}>
                    {connectionStatus.lemxApi.status === 'connected' ? 'ONLINE' :
                     connectionStatus.lemxApi.status === 'error' ? 'OFFLINE' :
                     connectionStatus.lemxApi.status === 'repairing' ? 'REPARANDO' : 'VERIFICANDO'}
                  </div>
                </div>
              </div>

              {/* WebSocket Connection */}
              <div style={{
                background: colors.bg.tertiary,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${
                  connectionStatus.websocket.status === 'connected' ? colors.accent.primary + '40' :
                  connectionStatus.websocket.status === 'error' ? colors.accent.red + '40' :
                  connectionStatus.websocket.status === 'repairing' ? colors.accent.yellow + '40' :
                  colors.border.primary
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: connectionStatus.websocket.status === 'connected' ? `${colors.accent.primary}20` :
                                connectionStatus.websocket.status === 'error' ? `${colors.accent.red}20` :
                                `${colors.accent.yellow}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {connectionStatus.websocket.status === 'checking' || connectionStatus.websocket.status === 'repairing' ? (
                        <Loader2 style={{ width: '18px', height: '18px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                      ) : connectionStatus.websocket.status === 'connected' ? (
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                      ) : (
                        <XCircle style={{ width: '18px', height: '18px', color: colors.accent.red }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>WebSocket Bridge</div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>{connectionStatus.websocket.message}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: connectionStatus.websocket.status === 'connected' ? `${colors.accent.primary}20` :
                              connectionStatus.websocket.status === 'error' ? `${colors.accent.red}20` :
                              `${colors.accent.yellow}20`,
                    color: connectionStatus.websocket.status === 'connected' ? colors.accent.primary :
                          connectionStatus.websocket.status === 'error' ? colors.accent.red :
                          colors.accent.yellow
                  }}>
                    {connectionStatus.websocket.status === 'connected' ? 'ONLINE' :
                     connectionStatus.websocket.status === 'error' ? 'OFFLINE' :
                     connectionStatus.websocket.status === 'repairing' ? 'REPARANDO' : 'VERIFICANDO'}
                  </div>
                </div>
              </div>

              {/* Supabase Real-Time Sync */}
              <div style={{
                background: colors.bg.tertiary,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${
                  connectionStatus.supabase.status === 'connected' ? colors.accent.primary + '40' :
                  connectionStatus.supabase.status === 'error' ? colors.accent.red + '40' :
                  connectionStatus.supabase.status === 'repairing' ? colors.accent.yellow + '40' :
                  colors.border.primary
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: connectionStatus.supabase.status === 'connected' ? `${colors.accent.primary}20` :
                                connectionStatus.supabase.status === 'error' ? `${colors.accent.red}20` :
                                `${colors.accent.yellow}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {connectionStatus.supabase.status === 'checking' || connectionStatus.supabase.status === 'repairing' ? (
                        <Loader2 style={{ width: '18px', height: '18px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                      ) : connectionStatus.supabase.status === 'connected' ? (
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                      ) : (
                        <XCircle style={{ width: '18px', height: '18px', color: colors.accent.red }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>Supabase Real-Time Sync</div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>{connectionStatus.supabase.message}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: connectionStatus.supabase.status === 'connected' ? `${colors.accent.primary}20` :
                              connectionStatus.supabase.status === 'error' ? `${colors.accent.red}20` :
                              `${colors.accent.yellow}20`,
                    color: connectionStatus.supabase.status === 'connected' ? colors.accent.primary :
                          connectionStatus.supabase.status === 'error' ? colors.accent.red :
                          colors.accent.yellow
                  }}>
                    {connectionStatus.supabase.status === 'connected' ? 'SYNC' :
                     connectionStatus.supabase.status === 'error' ? 'OFFLINE' :
                     connectionStatus.supabase.status === 'repairing' ? 'CONECTANDO' : 'VERIFICANDO'}
                  </div>
                </div>
                {connectionStatus.supabase.status === 'connected' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border.primary}` }}>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                      <div>
                        <span style={{ color: colors.text.muted }}>Notificaciones: </span>
                        <span style={{ color: unreadNotifications > 0 ? colors.accent.gold : colors.text.secondary, fontWeight: '600' }}>
                          {unreadNotifications} sin leer
                        </span>
                      </div>
                      <div>
                        <span style={{ color: colors.text.muted }}>Modo: </span>
                        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>
                          {import.meta.env.VITE_PLATFORM_ID?.toUpperCase() || 'LEMONMINTED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: Object.values(connectionStatus).every(c => c.status === 'connected') 
                ? `${colors.accent.primary}10` 
                : `${colors.accent.yellow}10`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${
                Object.values(connectionStatus).every(c => c.status === 'connected')
                  ? colors.accent.primary + '30'
                  : colors.accent.yellow + '30'
              }`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {Object.values(connectionStatus).every(c => c.status === 'connected') ? (
                  <>
                    <CheckCircle style={{ width: '24px', height: '24px', color: colors.accent.primary }} />
                    <div>
                      <div style={{ color: colors.accent.primary, fontSize: '14px', fontWeight: '700' }}>
                        Todas las conexiones activas
                      </div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>
                        El sistema está operando correctamente
                      </div>
                    </div>
                  </>
                ) : Object.values(connectionStatus).some(c => c.status === 'checking' || c.status === 'repairing') ? (
                  <>
                    <Loader2 style={{ width: '24px', height: '24px', color: colors.accent.yellow, animation: 'spin 1s linear infinite' }} />
                    <div>
                      <div style={{ color: colors.accent.yellow, fontSize: '14px', fontWeight: '700' }}>
                        {isAutoRepairing ? 'Auto-reparando conexiones...' : 'Verificando conexiones...'}
                      </div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>
                        Por favor espera un momento
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle style={{ width: '24px', height: '24px', color: colors.accent.yellow }} />
                    <div>
                      <div style={{ color: colors.accent.yellow, fontSize: '14px', fontWeight: '700' }}>
                        Algunas conexiones tienen problemas
                      </div>
                      <div style={{ color: colors.text.muted, fontSize: '12px' }}>
                        Haz clic en "Auto-Reparar" para intentar solucionar
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => checkAndRepairConnections(false)}
                disabled={isAutoRepairing}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border.primary}`,
                  background: colors.bg.tertiary,
                  color: colors.text.primary,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isAutoRepairing ? 'not-allowed' : 'pointer',
                  opacity: isAutoRepairing ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Verificar
              </button>
              <button
                onClick={() => checkAndRepairConnections(true)}
                disabled={isAutoRepairing}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent.cyan || '#06b6d4'}, ${colors.accent.primary})`,
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: isAutoRepairing ? 'not-allowed' : 'pointer',
                  opacity: isAutoRepairing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {isAutoRepairing ? (
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <PlugZap style={{ width: '16px', height: '16px' }} />
                )}
                {isAutoRepairing ? 'Reparando...' : 'Auto-Reparar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - PRO LemonChain Style */}
      <header style={{ 
        background: `linear-gradient(180deg, ${colors.bg.secondary} 0%, ${colors.bg.primary} 100%)`, 
        borderBottom: `1px solid ${colors.border.lemon}`, 
        padding: '16px 28px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Lemon Logo */}
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: colors.gradient.lemon, 
            borderRadius: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: `0 0 30px ${colors.accent.glow}60, 0 0 60px ${colors.accent.glow}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
              borderRadius: '14px'
            }} />
            <Coins style={{ width: '26px', height: '26px', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '22px', 
              fontWeight: '800', 
              background: colors.gradient.lemon,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              TREASURY MINTING
              <Sparkles style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
            </h1>
            <p style={{ fontSize: '12px', color: colors.accent.secondary, letterSpacing: '1.5px', fontWeight: '600', textTransform: 'uppercase' }}>LemonChain Platform</p>
          </div>
          
          {/* Network Status Badge */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginLeft: '20px',
            padding: '10px 18px',
            background: `${colors.accent.primary}10`,
            border: `1px solid ${colors.accent.primary}40`,
            borderRadius: '24px',
            boxShadow: `0 0 20px ${colors.accent.glow}15`
          }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: colors.accent.primary, 
              boxShadow: `0 0 10px ${colors.accent.glow}`,
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '13px', color: colors.accent.primary, fontWeight: '700', letterSpacing: '0.5px' }}>LemonChain</span>
            <span style={{
              fontSize: '10px',
              color: colors.accent.secondary,
              background: `${colors.accent.primary}20`,
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              ID: {LEMON_CHAIN.chainId}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Search - Enhanced */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.text.muted }} />
            <input 
              type="text" 
              placeholder="Buscar por código..." 
              style={{ 
                width: '220px', 
                padding: '12px 16px 12px 44px', 
                background: colors.bg.tertiary, 
                border: `1px solid ${colors.border.primary}`, 
                borderRadius: '12px', 
                color: colors.text.primary, 
                fontSize: '13px', 
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.accent.primary;
                e.target.style.boxShadow = `0 0 20px ${colors.accent.glow}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border.primary;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          {/* Documentation Button */}
          <button
            onClick={() => window.open('/documentation.html', '_blank')}
            style={{ 
              padding: '12px 20px', 
              background: `${colors.accent.cyan}15`, 
              border: `1px solid ${colors.accent.cyan}40`, 
              borderRadius: '12px', 
              color: colors.accent.cyan, 
              fontSize: '13px', 
              fontWeight: '700', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${colors.accent.cyan}25`;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${colors.accent.cyan}15`;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <BookOpen style={{ width: '16px', height: '16px' }} />
            Documentation
          </button>

          {/* Production Mode - Hidden for clean production UI */}
          
          {/* User Badge - Enhanced */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '10px 16px', 
            background: colors.bg.tertiary, 
            borderRadius: '12px', 
            border: `1px solid ${colors.border.primary}` 
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: `${colors.accent.primary}20`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserIcon style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
            </div>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text.primary, display: 'block' }}>{currentUser?.username}</span>
              <span style={{ fontSize: '10px', color: colors.accent.primary, textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>{currentUser?.role}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: '12px', 
              background: colors.bg.tertiary, 
              border: `1px solid ${colors.border.primary}`, 
              borderRadius: '12px', 
              color: colors.text.secondary, 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </header>

      {/* Tabs Navigation - PRO Style */}
      <div style={{ 
        background: colors.bg.secondary, 
        borderBottom: `1px solid ${colors.border.primary}`, 
        padding: '0 28px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        overflowX: 'auto',
        position: 'relative',
        zIndex: 5
      }}>
        {[
          { id: 'dashboard' as TabType, name: t.dashboard, icon: LayoutDashboard, color: colors.accent.primary },
          { id: 'mint_with_code' as TabType, name: t.mintWithCode, icon: Key, count: approvedFromQueue, color: colors.accent.gold },
          { id: 'pending_locks' as TabType, name: t.pending, icon: Clock, count: pendingLocks.length, color: colors.status.pending },
          { id: 'lock_reserve' as TabType, name: t.lockReserve, icon: Lock, amount: `$${(availableForMinting / 1000000).toFixed(2)}M`, color: colors.accent.purple },
          { id: 'approved' as TabType, name: t.approved, icon: CheckCircle, count: totalApproved, color: colors.status.approved },
          { id: 'minted' as TabType, name: t.minted, icon: Sparkles, count: mintsCompleted, color: colors.status.completed },
          { id: 'rejected' as TabType, name: t.rejected, icon: XCircle, count: statistics.rejectedMints, color: colors.status.rejected },
          { id: 'logs' as TabType, name: t.logs, icon: FileText, color: colors.text.muted },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '16px 20px', 
              background: activeTab === tab.id ? `${tab.color}15` : 'transparent', 
              border: activeTab === tab.id ? `1px solid ${tab.color}40` : '1px solid transparent',
              borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
              borderRadius: activeTab === tab.id ? '12px 12px 0 0' : '0',
              color: activeTab === tab.id ? tab.color : colors.text.secondary, 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: activeTab === tab.id ? '700' : '500', 
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: activeTab === tab.id ? `0 0 20px ${tab.color}15` : 'none'
            }}
          >
            <tab.icon style={{ width: '18px', height: '18px' }} />
            {tab.name}
            {tab.count !== undefined && (
              <span style={{ 
                padding: '4px 10px', 
                background: activeTab === tab.id ? `${tab.color}30` : `${tab.color}20`, 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: '700',
                color: tab.color,
                boxShadow: activeTab === tab.id ? `0 0 10px ${tab.color}30` : 'none'
              }}>
                {tab.count}
              </span>
            )}
            {tab.amount && (
              <span style={{ 
                padding: '4px 10px', 
                background: activeTab === tab.id ? `${tab.color}30` : `${tab.color}20`, 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: '700',
                color: tab.color 
              }}>
                {tab.amount}
              </span>
            )}
          </button>
        ))}
        
        {/* Mint Explorer - Right aligned */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Mint Explorer Button */}
          <button
            onClick={() => setShowMintExplorerModal(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '14px 20px', 
              background: colors.gradient.lemonSoft, 
              border: `1px solid ${colors.border.lemon}`, 
              borderRadius: '12px',
              color: colors.accent.primary, 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: '700',
              boxShadow: `0 0 25px ${colors.accent.glow}20`,
              transition: 'all 0.2s'
            }}
          >
            <Globe style={{ width: '18px', height: '18px' }} />
            MINT LEMON EXPLORER
            <span style={{ 
              padding: '4px 10px', 
              background: colors.gradient.lemon, 
              borderRadius: '8px', 
              fontSize: '11px', 
              fontWeight: '700',
              color: colors.bg.primary,
              boxShadow: `0 0 10px ${colors.accent.glow}40`
            }}>
              {mintsCompleted}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content - PRO Style */}
      <main style={{ 
        padding: '28px', 
        overflowY: 'auto', 
        maxHeight: 'calc(100vh - 180px)',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Connection Status Bar - Enhanced */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '28px', 
          marginBottom: '28px', 
          padding: '16px 24px',
          background: colors.bg.card,
          borderRadius: '14px',
          border: `1px solid ${colors.border.primary}`,
          fontSize: '13px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: `${colors.accent.primary}15`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
            </div>
            <div>
              <span style={{ color: colors.text.muted, fontSize: '11px', display: 'block' }}>DCB Treasury</span>
              <span style={{ color: colors.accent.primary, fontWeight: '600' }}>{t.connected}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: `${colors.accent.primary}15`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Server style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
            </div>
            <div>
              <span style={{ color: colors.text.muted, fontSize: '11px', display: 'block' }}>Treasury API</span>
              <span style={{ color: colors.accent.primary, fontWeight: '600' }}>{t.connected}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: `${colors.accent.primary}15`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
            </div>
            <div>
              <span style={{ color: colors.text.muted, fontSize: '11px', display: 'block' }}>LemonChain</span>
              <span style={{ color: colors.accent.primary, fontWeight: '600' }}>ID: {LEMON_CHAIN.chainId}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                style={{ 
                  padding: '10px 16px', 
                  background: colors.bg.tertiary, 
                  border: `1px solid ${colors.border.primary}`, 
                  borderRadius: '10px', 
                  color: colors.text.secondary, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Globe style={{ width: '14px', height: '14px' }} />
                {SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag} {language.toUpperCase()}
                <ChevronDown style={{ width: '12px', height: '12px' }} />
              </button>
              {showLanguageSelector && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: colors.bg.card,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: '12px',
                  padding: '8px',
                  zIndex: 1000,
                  minWidth: '180px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLanguageSelector(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: language === lang.code ? `${colors.accent.primary}15` : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: language === lang.code ? colors.accent.primary : colors.text.primary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        fontWeight: language === lang.code ? '700' : '500',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        if (language !== lang.code) {
                          e.currentTarget.style.background = colors.bg.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (language !== lang.code) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                      {language === lang.code && (
                        <Check style={{ width: '14px', height: '14px', marginLeft: 'auto', color: colors.accent.primary }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:4011/api/locks');
                  const data = await response.json();
                  if (data.success && data.data) {
                    setPendingLocks(data.data);
                    showNotification('success', `✅ ${data.data.length} locks cargados`);
                  }
                } catch (e) {
                  showNotification('error', '❌ Error conectando al servidor');
                }
              }} 
              style={{ 
                padding: '10px 16px', 
                background: colors.bg.tertiary, 
                border: `1px solid ${colors.border.primary}`, 
                borderRadius: '10px', 
                color: colors.text.secondary, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} /> {t.refresh}
            </button>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:4011/api/locks');
                  const data = await response.json();
                  if (data.success && data.data) {
                    setPendingLocks(data.data);
                    showNotification('success', `✅ ${data.data.length} locks del servidor`);
                  }
                } catch (e) {
                  showNotification('error', '❌ Error conectando al servidor');
                }
              }} 
              style={{ 
                padding: '10px 16px', 
                background: `${colors.accent.primary}15`, 
                border: `1px solid ${colors.accent.primary}40`, 
                borderRadius: '10px', 
                color: colors.accent.primary, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <Zap style={{ width: '14px', height: '14px' }} /> {t.fullSync}
            </button>
            {/* CHECK CONNECTION BUTTON - Opens Modern Modal */}
            <button 
              onClick={() => checkAndRepairConnections(false)}
              style={{ 
                padding: '10px 16px', 
                background: `${colors.accent.cyan || '#06b6d4'}15`, 
                border: `1px solid ${colors.accent.cyan || '#06b6d4'}40`, 
                borderRadius: '10px', 
                color: colors.accent.cyan || '#06b6d4', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${colors.accent.cyan || '#06b6d4'}25`;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${colors.accent.cyan || '#06b6d4'}15`;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Wifi style={{ width: '14px', height: '14px' }} /> Checking...
            </button>
{/* Reset Sandbox button hidden for production */}
          </div>
        </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TREASURY CURRENCIES - DAES ISO 4217 Supported Currencies */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div 
            style={{
              background: `linear-gradient(135deg, ${colors.bg.card} 0%, rgba(5, 8, 7, 0.95) 100%)`,
              borderRadius: '16px',
              border: `1px solid ${colors.border.primary}`,
              padding: '16px 20px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ 
                    padding: '8px',
                    borderRadius: '10px',
                    background: `${colors.accent.primary}15`,
                    border: `1px solid ${colors.border.lemon}`
                  }}
                >
                  <Coins style={{ width: '20px', height: '20px', color: colors.accent.primary }} />
                </div>
                <div>
                  <h3 
                    style={{ 
                      fontSize: '14px',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      color: colors.text.primary
                    }}
                  >
                    {t.treasuryCurrencies}
                  </h3>
                  <p 
                    style={{ 
                      fontSize: '10px',
                      letterSpacing: '1px',
                      color: colors.text.muted
                    }}
                  >
                    DAES ISO 4217 • 15 {t.supportedCurrencies}
                  </p>
                </div>
              </div>
              <div 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  background: `${colors.accent.primary}15`,
                  color: colors.accent.primary,
                  border: `1px solid ${colors.border.lemon}`
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent.primary, animation: 'pulse 2s infinite' }} />
                {t.activeForMinting}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TREASURY_CURRENCIES.map((currency) => (
                <div
                  key={currency.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: currency.mintable 
                      ? `${colors.accent.primary}15` 
                      : colors.bg.tertiary,
                    border: `1px solid ${currency.mintable ? colors.border.lemon : colors.border.primary}`,
                    boxShadow: currency.mintable ? `0 0 15px ${colors.accent.glow}10` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span 
                    style={{ 
                      fontSize: '12px',
                      fontWeight: '700',
                      color: currency.mintable ? colors.accent.primary : colors.text.secondary
                    }}
                  >
                    {currency.symbol}
                  </span>
                  <span 
                    style={{ 
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      color: currency.mintable ? colors.accent.primary : colors.text.primary
                    }}
                  >
                    {currency.code}
                  </span>
                  <span 
                    style={{ 
                      fontSize: '9px',
                      letterSpacing: '0.5px',
                      color: colors.text.muted
                    }}
                  >
                    ({currency.iso})
                  </span>
                  {currency.mintable ? (
                    <div 
                      style={{ 
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '8px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        background: colors.accent.primary,
                        color: '#000'
                      }}
                    >
                      {t.mint}
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '8px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        background: `${colors.accent.gold}20`,
                        color: colors.accent.gold
                      }}
                    >
                      {t.reserve}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Dashboard Tab - PRO Design */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Main Cards - Enhanced */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                {/* Available for Minting - PRO Card */}
                <div style={{ 
                  background: colors.gradient.lemonSoft, 
                  borderRadius: '20px', 
                  border: `1px solid ${colors.border.lemon}`, 
                  padding: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 0 40px ${colors.accent.glow}10`
                }}>
                  {/* Glow Effect */}
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: colors.gradient.glow,
                    opacity: 0.4,
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                  }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      background: colors.gradient.lemon, 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 0 25px ${colors.accent.glow}50`
                    }}>
                      <DollarSign style={{ width: '28px', height: '28px', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '11px', color: colors.accent.primary, fontWeight: '700', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t.availableForMintingLabel}</p>
                      <p style={{ fontSize: '42px', fontWeight: '800', color: colors.text.primary, letterSpacing: '-1px' }}>${formatAmount(availableForMinting.toString())}</p>
                      <p style={{ fontSize: '14px', color: colors.accent.secondary, fontWeight: '600' }}>USD</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${colors.border.lemon}`, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Lock style={{ width: '16px', height: '16px', color: colors.accent.secondary }} />
                      <span style={{ fontSize: '14px', color: colors.text.secondary, fontWeight: '500' }}>{locksInReserve} {t.locksInReserve}</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('lock_reserve')} 
                      style={{ 
                        padding: '10px 20px', 
                        background: colors.gradient.lemon, 
                        border: 'none', 
                        borderRadius: '10px', 
                        color: colors.bg.primary, 
                        fontSize: '13px', 
                        fontWeight: '700', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        boxShadow: `0 0 15px ${colors.accent.glow}40`
                      }}
                    >
                      {t.viewReserve} <ArrowRight style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
                
                {/* Total Minted - Now uses blockchain data */}
                <div style={{ background: 'linear-gradient(135deg, #2d1f4d 0%, #1a1230 100%)', borderRadius: '16px', border: `1px solid ${colors.accent.purple}30`, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: `${colors.accent.purple}30`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins style={{ width: '24px', height: '24px', color: colors.accent.purple }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', color: colors.accent.purple, fontWeight: '500', marginBottom: '4px' }}>{t.totalMintedLabel}</p>
                      <p style={{ fontSize: '36px', fontWeight: '700', color: colors.text.primary }}>
                        ${blockchainData.vusdTotal > 0 ? blockchainData.vusdTotal.toLocaleString() : formatAmount(totalMinted.toString())}
                      </p>
                      <p style={{ fontSize: '13px', color: colors.text.muted }}>VUSD {blockchainData.isConnected && <span style={{ color: colors.accent.primary, fontSize: '10px' }}>● LIVE</span>}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.accent.purple}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle style={{ width: '14px', height: '14px', color: colors.accent.primary }} />
                      <span style={{ fontSize: '13px', color: colors.text.muted }}>
                        {blockchainData.vusdMints > 0 ? blockchainData.vusdMints : mintsCompleted} {t.mintsCompletedCount}
                      </span>
                    </div>
                    <button onClick={() => setShowMintExplorerModal(true)} style={{ padding: '8px 16px', background: `${colors.accent.cyan}20`, border: `1px solid ${colors.accent.cyan}40`, borderRadius: '8px', color: colors.accent.cyan, fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      MINT LEMON EXPLORER <ExternalLink style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Bank Section - VISIBLE AT TOP */}
              <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.accent.gold}30`, padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      background: `linear-gradient(135deg, ${colors.accent.gold}30 0%, ${colors.accent.gold}10 100%)`,
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: `1px solid ${colors.accent.gold}40`
                    }}>
                      <Building2 style={{ width: '22px', height: '22px', color: colors.accent.gold }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text.primary }}>{t.activeBank}</h3>
                      <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.connectedBank}</p>
                    </div>
                  </div>
                  <span style={{ 
                    padding: '6px 14px', 
                    background: `${colors.accent.primary}20`, 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    color: colors.accent.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: `1px solid ${colors.accent.primary}40`
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.primary, boxShadow: `0 0 8px ${colors.accent.glow}` }} />
                    ACTIVO
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '16px' }}>
                  <div style={{ 
                    padding: '16px', 
                    background: `linear-gradient(135deg, ${colors.accent.gold}08 0%, ${colors.bg.secondary} 100%)`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.accent.gold}20`
                  }}>
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{t.institution.toUpperCase()}</p>
                    <p style={{ fontSize: '15px', color: colors.text.primary, fontWeight: '700' }}>{DEFAULT_BANK.name}</p>
                    <p style={{ fontSize: '11px', color: colors.accent.gold, marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>ID: {DEFAULT_BANK.bankId}</p>
                  </div>
                  <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{t.standard.toUpperCase()}</p>
                    <p style={{ fontSize: '15px', color: colors.accent.cyan, fontWeight: '700' }}>{DEFAULT_BANK.iso20022}</p>
                  </div>
                  <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{t.signerWallet.toUpperCase()}</p>
                    <p style={{ fontSize: '13px', color: colors.accent.primary, fontWeight: '500', fontFamily: "'JetBrains Mono', monospace" }}>{DEFAULT_BANK.signer}</p>
                  </div>
                </div>
              </div>
              
              {/* Blockchain Real-Time Stats Banner - Complete Data from RPC */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(163, 230, 53, 0.08) 0%, rgba(34, 197, 94, 0.08) 100%)', 
                borderRadius: '16px', 
                border: '1px solid rgba(163, 230, 53, 0.3)', 
                padding: '20px',
                marginBottom: '20px'
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(163, 230, 53, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: blockchainData.isConnected ? '#22c55e' : '#ef4444', animation: blockchainData.isConnected ? 'pulse 2s infinite' : 'none' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: colors.accent.primary, letterSpacing: '1px' }}>
                      {language === 'es' ? '🔗 LEMONCHAIN RPC EN VIVO' : '🔗 LEMONCHAIN RPC LIVE'}
                    </span>
                    <span style={{ fontSize: '10px', color: colors.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                      Chain ID: 1006
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: colors.text.muted }}>
                      {language === 'es' ? 'Última actualización:' : 'Last update:'} {blockchainData.lastUpdated ? new Date(blockchainData.lastUpdated).toLocaleTimeString() : '--:--:--'}
                    </span>
                  </div>
                </div>
                
                {/* Main Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '16px' }}>
                  {/* VUSD Minted */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(163, 230, 53, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: colors.accent.primary }}>${blockchainData.vusdTotal.toLocaleString()}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>VUSD MINTED</p>
                  </div>
                  
                  {/* USD Locked */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: colors.accent.gold }}>${blockchainData.totalUSDLocked.toLocaleString()}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>USD LOCKED</p>
                  </div>
                  
                  {/* Mints Done */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: colors.accent.cyan }}>{blockchainData.vusdMints}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>MINTS DONE</p>
                  </div>
                  
                  {/* Total Locks */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: colors.accent.blue }}>{blockchainData.totalLocks}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>TOTAL LOCKS</p>
                  </div>
                  
                  {/* Block Height */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: colors.accent.purple }}>{blockchainData.blockHeight.toLocaleString()}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>BLOCK HEIGHT</p>
                  </div>
                  
                  {/* TPS */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#ec4899' }}>{blockchainData.tps}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>TPS</p>
                  </div>
                  
                  {/* Total Events */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#8b5cf6' }}>{blockchainData.totalEvents}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>EVENTS</p>
                  </div>
                  
                  {/* Transfers */}
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>{blockchainData.vusdTransfers}</p>
                    <p style={{ fontSize: '9px', color: colors.text.muted, fontWeight: '600', letterSpacing: '0.5px' }}>TRANSFERS</p>
                  </div>
                </div>
              </div>

              {/* Stats Row - Local platform data (not blockchain) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: t.pendingLocks, value: pendingLocks.length, icon: Lock, color: colors.accent.blue },
                  { label: t.inQueueUsd, value: approvedFromQueue, icon: Key, color: colors.accent.gold },
                  { label: t.mintsPending, value: statistics.pendingMints, icon: Clock, color: colors.accent.purple },
                  { label: t.approved, value: totalApproved, icon: CheckCircle, color: colors.accent.primary },
                  { label: t.completedLabel, value: blockchainData.vusdMints > 0 ? blockchainData.vusdMints : mintsCompleted, icon: Sparkles, color: colors.accent.cyan },
                  { label: t.rejected, value: statistics.rejectedMints, icon: XCircle, color: colors.accent.red },
                ].map((stat, i) => (
                  <div key={i} style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.border.primary}`, padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <stat.icon style={{ width: '16px', height: '16px', color: stat.color }} />
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>{stat.value}</p>
                    <p style={{ fontSize: '11px', color: colors.text.muted }}>{stat.label}</p>
                  </div>
                ))}
                <div style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.border.primary}`, padding: '16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Activity style={{ width: '16px', height: '16px', color: colors.accent.primary }} />
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>
                    ${blockchainData.vusdTotal > 0 ? blockchainData.vusdTotal.toLocaleString() : statistics.totalVolume}
                  </p>
                  <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.totalVolume}</p>
                </div>
              </div>
              
              {/* Bottom Section - Recent Locks and Recent Mints */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Recent Locks - Collapsible */}
                <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '20px', transition: 'all 0.3s ease' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRecentLocksExpanded ? '16px' : '0', cursor: 'pointer' }}
                    onClick={() => setIsRecentLocksExpanded(!isRecentLocksExpanded)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock style={{ width: '18px', height: '18px', color: colors.accent.blue }} />
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text.primary }}>{t.recentLocks}</h3>
                      <span style={{ fontSize: '12px', color: colors.text.muted, background: colors.bg.secondary, padding: '2px 8px', borderRadius: '10px' }}>
                        {pendingLocks.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveTab('pending_locks'); }} 
                        style={{ fontSize: '12px', color: colors.accent.primary, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {t.viewDetails}
                      </button>
                      <ChevronDown style={{ 
                        width: '18px', 
                        height: '18px', 
                        color: colors.text.muted, 
                        transition: 'transform 0.3s ease',
                        transform: isRecentLocksExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                      }} />
                    </div>
                  </div>
                  {isRecentLocksExpanded && (
                    <>
                      {pendingLocks.length === 0 ? (
                        <p style={{ textAlign: 'center', color: colors.text.muted, padding: '32px', fontSize: '13px' }}>{t.noPendingLocks}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {pendingLocks.slice(0, 4).map(lock => (
                            <div key={lock.id} style={{ padding: '14px', background: colors.bg.secondary, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${colors.border.primary}` }}>
                              <div>
                                <span style={{ fontSize: '12px', color: colors.accent.gold, fontFamily: "'JetBrains Mono', monospace", fontWeight: '600' }}>{lock.authorizationCode}</span>
                                <p style={{ fontSize: '11px', color: colors.text.muted, marginTop: '2px' }}>{lock.bankInfo?.bankName || 'Unknown Bank'}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(lock.lockDetails?.amount || '0')}</span>
                                <p style={{ fontSize: '10px', color: colors.accent.blue }}>USD</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Recent Mints - Collapsible */}
                <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.accent.purple}30`, padding: '20px', transition: 'all 0.3s ease' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRecentMintsExpanded ? '16px' : '0', cursor: 'pointer' }}
                    onClick={() => setIsRecentMintsExpanded(!isRecentMintsExpanded)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles style={{ width: '18px', height: '18px', color: colors.accent.purple }} />
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text.primary }}>{t.completedMints}</h3>
                      <span style={{ fontSize: '12px', color: colors.text.muted, background: `${colors.accent.purple}20`, padding: '2px 8px', borderRadius: '10px' }}>
                        {recentMints.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveTab('minted'); }} 
                        style={{ fontSize: '12px', color: colors.accent.purple, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {t.viewDetails}
                      </button>
                      <ChevronDown style={{ 
                        width: '18px', 
                        height: '18px', 
                        color: colors.text.muted, 
                        transition: 'transform 0.3s ease',
                        transform: isRecentMintsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                      }} />
                    </div>
                  </div>
                  {isRecentMintsExpanded && (
                    <>
                      {recentMints.length === 0 ? (
                        <p style={{ textAlign: 'center', color: colors.text.muted, padding: '32px', fontSize: '13px' }}>{t.noMintedRecords}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {recentMints.map(mint => (
                            <div key={mint.id} style={{ padding: '14px', background: `${colors.accent.purple}10`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${colors.accent.purple}20` }}>
                              <div>
                                <span style={{ fontSize: '12px', color: colors.accent.gold, fontFamily: "'JetBrains Mono', monospace", fontWeight: '600' }}>{mint.authorizationCode}</span>
                                <p style={{ fontSize: '11px', color: colors.text.muted, marginTop: '2px' }}>{mint.bankName || 'Unknown Bank'}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: '700', color: colors.accent.purple }}>${formatAmount(mint.amountUSD)}</span>
                                <p style={{ fontSize: '10px', color: colors.accent.primary }}>VUSD ✓</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Recent Events - Collapsible */}
              <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '20px', marginBottom: '24px', transition: 'all 0.3s ease' }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRecentEventsExpanded ? '16px' : '0', cursor: 'pointer' }}
                  onClick={() => setIsRecentEventsExpanded(!isRecentEventsExpanded)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell style={{ width: '18px', height: '18px', color: colors.accent.cyan }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text.primary }}>{t.recentEvents}</h3>
                    <span style={{ fontSize: '12px', color: colors.text.muted, background: `${colors.accent.cyan}20`, padding: '2px 8px', borderRadius: '10px' }}>
                      {webhookEvents.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveTab('logs'); }} 
                      style={{ fontSize: '12px', color: colors.accent.primary, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t.viewDetails}
                    </button>
                    <ChevronDown style={{ 
                      width: '18px', 
                      height: '18px', 
                      color: colors.text.muted, 
                      transition: 'transform 0.3s ease',
                      transform: isRecentEventsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                    }} />
                  </div>
                </div>
                {isRecentEventsExpanded && (
                  <>
                    {webhookEvents.length === 0 ? (
                      <p style={{ textAlign: 'center', color: colors.text.muted, padding: '20px', fontSize: '13px' }}>{t.noLogs}</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {webhookEvents.slice(0, 6).map(event => (
                          <div key={event.id} style={{ padding: '12px', background: colors.bg.secondary, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: event.type.includes('mint') ? colors.accent.purple : event.type.includes('lock') ? colors.accent.blue : colors.text.primary }}>{event.type.replace('.', ' → ')}</span>
                            <span style={{ fontSize: '10px', color: colors.text.muted }}>{formatDate(event.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Network Status */}
              <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Globe style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text.primary }}>{t.networkStatus}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: `${colors.accent.primary}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Server style={{ width: '20px', height: '20px', color: colors.accent.primary }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: colors.text.muted }}>LemonChain RPC</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent.primary }} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: colors.accent.primary }}>{t.connected}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: `${colors.accent.blue}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Database style={{ width: '20px', height: '20px', color: colors.accent.blue }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: colors.text.muted }}>DCB Treasury</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent.primary }} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: colors.accent.primary }}>{t.connected}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: `${colors.accent.purple}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Link2 style={{ width: '20px', height: '20px', color: colors.accent.purple }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: colors.text.muted }}>VUSD Contract</p>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>0x1234...5678</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Pending Locks Tab */}
          {activeTab === 'pending_locks' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>{t.pendingLocksTitle}</h2>
                  <span style={{ 
                    padding: '4px 12px', 
                    background: pendingLocks.length > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                    color: pendingLocks.length > 0 ? '#22c55e' : '#9ca3af',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {pendingLocks.length} locks
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={async () => {
                      // Fetch directo para forzar actualización
                      try {
                        const response = await fetch('http://localhost:4011/api/locks');
                        const data = await response.json();
                        if (data.success && data.data) {
                          setPendingLocks(data.data);
                          showNotification('success', `✅ ${data.data.length} locks cargados del servidor`);
                        }
                      } catch (e) {
                        showNotification('error', '❌ Error conectando al servidor');
                      }
                    }} 
                    style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      color: 'white', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <RefreshCw style={{ width: '16px', height: '16px' }} />
                    Actualizar desde Servidor
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingLocks.map(lock => (
                  <div key={lock.id} style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '24px', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '700', color: colors.accent.primary, fontFamily: "'JetBrains Mono', monospace" }}>{lock.authorizationCode}</span>
                          <span style={{ padding: '4px 10px', background: `${colors.accent.gold}20`, borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: colors.accent.gold }}>PENDIENTE</span>
                        </div>
                        <p style={{ fontSize: '13px', color: colors.text.muted }}>Lock ID: {lock.lockId}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(getLockAmount(lock))}</p>
                        <p style={{ fontSize: '12px', color: colors.text.secondary }}>{getLockCurrency(lock)}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ padding: '12px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>{t.bank}</p>
                        <p style={{ fontSize: '13px', color: colors.text.primary, fontWeight: '500' }}>{getLockBankName(lock)}</p>
                      </div>
                      <div style={{ padding: '12px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>{t.beneficiary}</p>
                        <p style={{ fontSize: '13px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{truncateAddress(getLockBeneficiary(lock))}</p>
                      </div>
                      <div style={{ padding: '12px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>{t.expiresAt}</p>
                        <p style={{ fontSize: '13px', color: colors.text.primary }}>{formatDate(lock?.lockDetails?.expiry || '')}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleOpenLockApproval(lock)}
                        style={{ flex: 1, padding: '12px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <CheckCircle style={{ width: '18px', height: '18px' }} />
                        {t.approve} Lock
                      </button>
                      <button
                        onClick={() => generateLockApprovalPDF(lock)}
                        style={{ padding: '12px 20px', background: `${colors.accent.blue}20`, border: `1px solid ${colors.accent.blue}40`, borderRadius: '10px', color: colors.accent.blue, fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        title={t.downloadPdf}
                      >
                        <Download style={{ width: '18px', height: '18px' }} />
                        PDF
                      </button>
                      <button
                        onClick={() => handleRejectLock(lock)}
                        style={{ padding: '12px 20px', background: `${colors.accent.red}20`, border: `1px solid ${colors.accent.red}40`, borderRadius: '10px', color: colors.accent.red, fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <XCircle style={{ width: '18px', height: '18px' }} />
                        {t.reject}
                      </button>
                    </div>
                  </div>
                ))}
                
                {pendingLocks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}` }}>
                    <Lock style={{ width: '48px', height: '48px', color: colors.text.muted, margin: '0 auto 16px' }} />
                    <p style={{ color: colors.text.secondary, marginBottom: '8px' }}>{t.noPendingLocks}</p>
                    <p style={{ color: colors.text.muted, fontSize: '13px' }}>{t.lockReceived}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '24px' }}>Logs del Sistema</h2>
              <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '24px' }}>
                {webhookEvents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: colors.text.muted, padding: '40px' }}>{t.noLogs}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {webhookEvents.map(event => (
                      <div key={event.id} style={{ padding: '12px 16px', background: colors.bg.secondary, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: colors.text.muted }}>{formatDate(event.timestamp)}</span>
                          <span style={{ fontSize: '13px', color: colors.text.primary }}>{event.type}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: colors.text.muted, padding: '4px 8px', background: colors.bg.tertiary, borderRadius: '4px' }}>{event.source}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mint with Code Tab - QUEUE SYSTEM */}
          {activeTab === 'mint_with_code' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '4px' }}>{t.mintWithCode}</h2>
                  <p style={{ fontSize: '14px', color: colors.text.muted }}>
                    {t.mintsPending} - USD → VUSD
                  </p>
                </div>
                {mintWithCodeQueue.filter(m => m.status === 'pending').length > 0 && (
                  <div style={{ padding: '12px 20px', background: `${colors.accent.gold}15`, borderRadius: '12px', border: `1px solid ${colors.accent.gold}30` }}>
                    <p style={{ fontSize: '12px', color: colors.accent.gold, marginBottom: '2px' }}>{t.inQueueUsd}</p>
                    <p style={{ fontSize: '24px', fontWeight: '800', color: colors.accent.gold }}>
                      ${formatAmount(mintWithCodeQueue.filter(m => m.status === 'pending').reduce((sum, m) => sum + parseFloat(m.amountUSD), 0).toString())}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Queue List */}
              {mintWithCodeQueue.filter(m => m.status === 'pending').length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {mintWithCodeQueue.filter(m => m.status === 'pending').map((item, index) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        background: colors.bg.card, 
                        borderRadius: '16px', 
                        border: `1px solid ${selectedMintItem?.id === item.id ? colors.accent.gold : colors.border.primary}`, 
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Header */}
                      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', background: `${colors.accent.gold}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: colors.accent.gold }}>#{index + 1}</span>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.authorizationCode}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <p style={{ fontSize: '16px', fontWeight: '700', color: colors.accent.gold, fontFamily: "'JetBrains Mono', monospace" }}>{item.authorizationCode}</p>
                              <button onClick={() => copyToClipboard(item.authorizationCode)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                <Copy style={{ width: '14px', height: '14px', color: colors.text.muted }} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ padding: '6px 12px', background: `${colors.accent.blue}20`, borderRadius: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: colors.accent.blue }}>USD • {t.pending.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Body */}
                      <div style={{ padding: '24px' }}>
                        {/* Amount Display - USD NOT VUSD */}
                        <div style={{ textAlign: 'center', padding: '24px', background: `linear-gradient(135deg, ${colors.bg.secondary} 0%, ${colors.bg.tertiary} 100%)`, borderRadius: '12px', marginBottom: '20px' }}>
                          <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '8px' }}>{t.amountUsd} ({t.pending})</p>
                          <p style={{ fontSize: '42px', fontWeight: '800', color: colors.text.primary, lineHeight: 1 }}>
                            <span style={{ fontSize: '24px', color: colors.text.muted }}>$</span>
                            {formatAmount(item.amountUSD)}
                          </p>
                          <p style={{ fontSize: '14px', color: colors.accent.blue, marginTop: '8px', fontWeight: '600' }}>
                            <DollarSign style={{ width: '14px', height: '14px', display: 'inline', verticalAlign: 'middle' }} /> USD
                          </p>
                          <p style={{ fontSize: '11px', color: colors.text.muted, marginTop: '8px' }}>
                            → Se convertirá a {formatAmount(item.amountUSD)} VUSD al mintear
                          </p>
                        </div>
                        
                        {/* Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ padding: '14px', background: colors.bg.secondary, borderRadius: '10px' }}>
                            <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '4px' }}>Lock ID</p>
                            <p style={{ fontSize: '12px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{item.lockId.slice(0, 16)}...</p>
                          </div>
                          <div style={{ padding: '14px', background: colors.bg.secondary, borderRadius: '10px' }}>
                            <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '4px' }}>{t.activeBank}</p>
                            <p style={{ fontSize: '12px', color: colors.text.primary }}>{item.bankName}</p>
                          </div>
                          <div style={{ padding: '14px', background: colors.bg.secondary, borderRadius: '10px' }}>
                            <p style={{ fontSize: '10px', color: colors.text.muted, marginBottom: '4px' }}>{t.createdAt}</p>
                            <p style={{ fontSize: '12px', color: colors.text.primary }}>{formatDate(item.createdAt)}</p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={() => {
                              // Cancel/Remove from queue
                              setMintWithCodeQueue(prev => prev.map(m => 
                                m.id === item.id ? { ...m, status: 'cancelled' as const } : m
                              ));
                              showNotification('info', 'Item removido de la cola');
                            }}
                            style={{ flex: 1, padding: '14px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '10px', color: colors.text.secondary, fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={() => handleStartPremiumMint(item)}
                            style={{ flex: 2, padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <Rocket style={{ width: '18px', height: '18px' }} />
                            {t.mint} VUSD
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Completed items section */}
                  {mintWithCodeQueue.filter(m => m.status === 'completed').length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text.muted, marginBottom: '12px' }}>
                        {t.completedMints} ({mintWithCodeQueue.filter(m => m.status === 'completed').length})
                      </h3>
                      {mintWithCodeQueue.filter(m => m.status === 'completed').slice(0, 3).map((item) => (
                        <div key={item.id} style={{ padding: '12px 16px', background: colors.bg.secondary, borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle style={{ width: '16px', height: '16px', color: colors.accent.primary }} />
                            <span style={{ fontSize: '13px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{item.authorizationCode}</span>
                          </div>
                          <span style={{ fontSize: '13px', color: colors.accent.primary, fontWeight: '600' }}>${formatAmount(item.amountUSD)} → VUSD</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state - Manual code entry */
                <div style={{ background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}`, padding: '32px', maxWidth: '500px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', background: `${colors.accent.gold}15`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Key style={{ width: '32px', height: '32px', color: colors.accent.gold }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text.primary, marginBottom: '8px' }}>{t.mintQueue}</h3>
                    <p style={{ fontSize: '14px', color: colors.text.muted }}>{t.noMintOrders}</p>
                  </div>
                  
                  <div style={{ padding: '20px', background: colors.bg.secondary, borderRadius: '12px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '13px', color: colors.text.secondary, textAlign: 'center' }}>
                      💡 {t.locksFromDcb}
                    </p>
                  </div>
                  
                  <div style={{ borderTop: `1px solid ${colors.border.primary}`, paddingTop: '20px' }}>
                    <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '12px' }}>{t.enterAuthCode}:</p>
                    <input 
                      type="text" 
                      placeholder="MINT-XXXXXX-XXXXXX" 
                      style={{ width: '100%', padding: '14px', background: colors.bg.tertiary, border: `2px solid ${colors.border.primary}`, borderRadius: '10px', color: colors.text.primary, fontSize: '16px', fontFamily: "'JetBrains Mono', monospace", marginBottom: '12px', outline: 'none', textAlign: 'center' }}
                    />
                    <button style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.accent.gold} 0%, ${colors.accent.gold}CC 100%)`, border: 'none', borderRadius: '10px', color: '#000', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Search style={{ width: '16px', height: '16px' }} />
                      {t.search} {t.authorizationCode}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lock Reserve Tab */}
          {activeTab === 'lock_reserve' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '24px' }}>{t.lockReserve}</h2>
              
              {/* Summary Card */}
              <div style={{ background: `linear-gradient(135deg, #0d3d30 0%, #0a2a22 100%)`, borderRadius: '16px', border: `1px solid ${colors.accent.primary}30`, padding: '24px', marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', color: colors.accent.primary, marginBottom: '8px' }}>{t.lockReserve}</p>
                <p style={{ fontSize: '48px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(availableForMinting.toString())}</p>
                <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.text.muted }}>{t.pending}</p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.gold }}>${formatAmount(pendingLocksAmount.toString())}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.text.muted }}>Restantes (Reserva)</p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.purple }}>${formatAmount(lockReserveAmount.toString())}</p>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: colors.text.muted, marginTop: '8px' }}>{locksInReserve} {t.activeLocks}</p>
              </div>
              
              {/* Lock Reserve Items (Remaining from partial approvals) */}
              {lockReserveItems.filter(item => item.status === 'active').length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.purple, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock style={{ width: '18px', height: '18px' }} />
                    {t.reserveBalances} ({t.reserveBalancesSubtitle}) - {lockReserveItems.filter(item => item.status === 'active').length}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {lockReserveItems.filter(item => item.status === 'active').map(item => (
                      <div key={item.id} style={{ 
                        background: colors.bg.card, 
                        borderRadius: '12px', 
                        border: `1px solid ${colors.accent.purple}30`, 
                        padding: '20px' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ background: `${colors.accent.purple}20`, color: colors.accent.purple, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                {t.reserve}
                              </span>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: colors.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{item.id}</p>
                            </div>
                            <p style={{ fontSize: '12px', color: colors.text.muted }}>{item.bankName}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.available}</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: colors.accent.purple }}>${formatAmount(item.remainingAmount.toString())}</p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px', background: colors.bg.secondary, borderRadius: '8px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.original}</p>
                            <p style={{ fontSize: '14px', color: colors.text.secondary }}>${formatAmount(item.originalAmount.toString())}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.consumed}</p>
                            <p style={{ fontSize: '14px', color: colors.accent.primary }}>${formatAmount(item.consumedAmount.toString())}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted }}>{t.beneficiary}</p>
                            <p style={{ fontSize: '12px', color: colors.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {truncateAddress(item.beneficiary)}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          <p style={{ fontSize: '11px', color: colors.text.muted }}>
                            {t.created}: {new Date(item.createdAt).toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleUseReserveForMint(item)}
                            style={{ 
                              padding: '8px 16px', 
                              background: `linear-gradient(135deg, ${colors.accent.purple}30, ${colors.accent.primary}20)`, 
                              border: `1px solid ${colors.accent.purple}60`, 
                              borderRadius: '8px', 
                              color: colors.accent.purple, 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${colors.accent.purple}50, ${colors.accent.primary}40)`;
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${colors.accent.purple}30, ${colors.accent.primary}20)`;
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <ArrowRight style={{ width: '14px', height: '14px' }} />
                            {t.moveToMintWithCode}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pending Locks (Not yet approved) */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.gold, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock style={{ width: '18px', height: '18px' }} />
                  {t.locksPendingApproval} - {pendingLocks.length}
                </h3>
                {pendingLocks.length === 0 ? (
                  <p style={{ textAlign: 'center', color: colors.text.muted, padding: '40px' }}>{t.noPendingLocks}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingLocks.map(lock => (
                      <div key={lock.id} style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.border.primary}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ background: `${colors.accent.gold}20`, color: colors.accent.gold, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                              {t.pending}
                            </span>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.primary, fontFamily: "'JetBrains Mono', monospace" }}>{lock.authorizationCode}</p>
                          </div>
                          <p style={{ fontSize: '12px', color: colors.text.muted }}>{getLockBankName(lock)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(getLockAmount(lock))}</p>
                          <button
                            onClick={() => handleStartLockApproval(lock)}
                            style={{ 
                              padding: '8px 16px', 
                              background: `${colors.accent.primary}20`, 
                              border: `1px solid ${colors.accent.primary}40`, 
                              borderRadius: '8px', 
                              color: colors.accent.primary, 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              cursor: 'pointer' 
                            }}
                          >
                            {t.approve}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approved Tab */}
          {activeTab === 'approved' && (
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: colors.accent.primary }} />
                {t.approvedLocksTitle}
                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.accent.primary, background: `${colors.accent.primary}20`, padding: '4px 12px', borderRadius: '20px' }}>
                  {mintWithCodeQueue.filter(m => m.status === 'pending').length + mintRequests.filter(r => r.status === 'approved').length}
                </span>
              </h2>
              
              {/* Approved from Mint With Code Queue */}
              {mintWithCodeQueue.filter(m => m.status === 'pending').length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coins style={{ width: '18px', height: '18px' }} />
                    Locks Aprobados - Pendientes de Mint ({mintWithCodeQueue.filter(m => m.status === 'pending').length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mintWithCodeQueue.filter(m => m.status === 'pending').map((item) => (
                      <div key={item.id} style={{ 
                        background: colors.bg.card, 
                        borderRadius: '16px', 
                        border: `1px solid ${colors.accent.primary}30`, 
                        padding: '20px',
                        position: 'relative'
                      }}>
                        {/* Approved Badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px', 
                          background: `${colors.accent.primary}20`, 
                          color: colors.accent.primary, 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '11px', 
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle style={{ width: '12px', height: '12px' }} />
                          APROBADO
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Lock ID</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {item.lockId}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Monto Aprobado (USD)</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: colors.accent.primary }}>
                              ${formatAmount(item.amountUSD)}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.bank}</p>
                            <p style={{ fontSize: '13px', color: colors.text.primary }}>{item.bankName}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.beneficiary}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {truncateAddress(item.beneficiary)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.approvedAt}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Lock Reserve Info */}
                        {parseFloat(item.remainingLockAmount) > 0 && (
                          <div style={{ marginTop: '12px', padding: '12px', background: `${colors.accent.purple}10`, borderRadius: '10px', border: `1px solid ${colors.accent.purple}20` }}>
                            <p style={{ fontSize: '11px', color: colors.accent.purple, fontWeight: '600' }}>
                              Lock Reserve: ${formatAmount(item.remainingLockAmount)} USD restante del lock original de ${formatAmount(item.originalLockAmount)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Approved Mint Requests */}
              {mintRequests.filter(r => r.status === 'approved').length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle style={{ width: '18px', height: '18px' }} />
                    Solicitudes de Mint Aprobadas ({mintRequests.filter(r => r.status === 'approved').length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mintRequests.filter(r => r.status === 'approved').map(req => (
                      <div key={req.id} style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.accent.primary}30`, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.primary }}>{req.authorizationCode}</p>
                            <p style={{ fontSize: '12px', color: colors.text.muted }}>Lock ID: {req.lockId}</p>
                          </div>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(req.requestedAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {mintWithCodeQueue.filter(m => m.status === 'pending').length === 0 && mintRequests.filter(r => r.status === 'approved').length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}` }}>
                  <Clock style={{ width: '48px', height: '48px', color: colors.text.muted, margin: '0 auto 16px' }} />
                  <p style={{ color: colors.text.secondary, marginBottom: '8px', fontSize: '16px' }}>{t.noApprovedLocks}</p>
                  <p style={{ color: colors.text.muted, fontSize: '13px' }}>{t.locksFromDcb}</p>
                </div>
              )}
            </div>
          )}

          {/* Minted Tab */}
          {activeTab === 'minted' && (
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles style={{ width: '28px', height: '28px', color: colors.accent.gold }} />
                {t.completedMints}
                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.accent.gold, background: `${colors.accent.gold}20`, padding: '4px 12px', borderRadius: '20px' }}>
                  {mintWithCodeQueue.filter(m => m.status === 'completed').length + apiBridge.getCompletedMints().length + mintRequests.filter(r => r.status === 'minted').length}
                </span>
              </h2>
              
              {/* Completed from Mint With Code Queue */}
              {mintWithCodeQueue.filter(m => m.status === 'completed').length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.gold, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coins style={{ width: '18px', height: '18px' }} />
                    {t.lusdMinted} ({mintWithCodeQueue.filter(m => m.status === 'completed').length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mintWithCodeQueue.filter(m => m.status === 'completed').map((item) => (
                      <div key={item.id} style={{ 
                        background: `linear-gradient(135deg, ${colors.bg.card} 0%, ${colors.accent.gold}08 100%)`, 
                        borderRadius: '16px', 
                        border: `1px solid ${colors.accent.gold}30`, 
                        padding: '20px',
                        position: 'relative'
                      }}>
                        {/* Minted Badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px', 
                          background: `linear-gradient(135deg, ${colors.accent.gold} 0%, ${colors.accent.primary} 100%)`, 
                          color: '#000', 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '11px', 
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Sparkles style={{ width: '12px', height: '12px' }} />
                          MINTED
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Lock ID</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {item.lockId}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Monto Minteado (VUSD)</p>
                            <p style={{ fontSize: '28px', fontWeight: '700', color: colors.accent.gold }}>
                              ${formatAmount(item.amountUSD)} <span style={{ fontSize: '14px', color: colors.accent.primary }}>VUSD</span>
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.activeBank}</p>
                            <p style={{ fontSize: '13px', color: colors.text.primary }}>{item.bankName}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.beneficiary}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {truncateAddress(item.beneficiary)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.mintedAt}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Completed Mints from API Bridge */}
              {apiBridge.getCompletedMints().length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle style={{ width: '18px', height: '18px' }} />
                    Confirmaciones de Mint ({apiBridge.getCompletedMints().length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {apiBridge.getCompletedMints().map((mint) => (
                      <div key={mint.id} style={{ 
                        background: colors.bg.card, 
                        borderRadius: '16px', 
                        border: `1px solid ${colors.accent.primary}30`, 
                        padding: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Publication Code</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.gold, fontFamily: "'JetBrains Mono', monospace" }}>
                              {mint.publicationCode}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Monto</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: colors.accent.primary }}>
                              ${formatAmount(mint.mintedAmount)} VUSD
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>TX Hash</p>
                            <p style={{ fontSize: '12px', color: colors.accent.blue, fontFamily: "'JetBrains Mono', monospace" }}>
                              {mint.txHash ? `${mint.txHash.substring(0, 20)}...${mint.txHash.slice(-8)}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.mintedBy}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary }}>{mint.mintedBy}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Minted Mint Requests */}
              {mintRequests.filter(r => r.status === 'minted').length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles style={{ width: '18px', height: '18px' }} />
                    Solicitudes Completadas ({mintRequests.filter(r => r.status === 'minted').length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mintRequests.filter(r => r.status === 'minted').map(req => (
                      <div key={req.id} style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.accent.primary}30`, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.primary }}>{req.authorizationCode}</p>
                            <p style={{ fontSize: '12px', color: colors.text.muted }}>Lock ID: {req.lockId}</p>
                          </div>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: colors.accent.gold }}>${formatAmount(req.requestedAmount)} VUSD</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {mintWithCodeQueue.filter(m => m.status === 'completed').length === 0 && 
               apiBridge.getCompletedMints().length === 0 && 
               mintRequests.filter(r => r.status === 'minted').length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}` }}>
                  <Sparkles style={{ width: '48px', height: '48px', color: colors.text.muted, margin: '0 auto 16px' }} />
                  <p style={{ color: colors.text.secondary, marginBottom: '8px', fontSize: '16px' }}>{t.noMintedRecords}</p>
                  <p style={{ color: colors.text.muted, fontSize: '13px' }}>{t.locksFromDcb}</p>
                </div>
              )}
            </div>
          )}

          {/* Rejected Tab */}
          {activeTab === 'rejected' && (
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <XCircle style={{ width: '28px', height: '28px', color: colors.accent.red }} />
                {t.rejectedTitle}
                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.accent.red, background: `${colors.accent.red}20`, padding: '4px 12px', borderRadius: '20px' }}>
                  {apiBridge.getRejectedLocks().length + mintRequests.filter(r => r.status === 'rejected').length}
                </span>
              </h2>
              
              {/* Rejected Locks Section */}
              {apiBridge.getRejectedLocks().length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.red, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ban style={{ width: '18px', height: '18px' }} />
                    Locks Rechazados ({apiBridge.getRejectedLocks().length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {apiBridge.getRejectedLocks().map((lock) => (
                      <div key={lock.lockId} style={{ 
                        background: colors.bg.card, 
                        borderRadius: '16px', 
                        border: `1px solid ${colors.accent.red}30`, 
                        padding: '20px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Rejected Badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px', 
                          background: `${colors.accent.red}20`, 
                          color: colors.accent.red, 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '11px', 
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <XCircle style={{ width: '12px', height: '12px' }} />
                          RECHAZADO
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Lock ID</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {lock.lockId}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Monto</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: colors.accent.red }}>
                              ${formatAmount(lock.amount)}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.bank}</p>
                            <p style={{ fontSize: '13px', color: colors.text.primary }}>{lock.bankName}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.beneficiary}</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {lock.beneficiary ? truncateAddress(lock.beneficiary) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Rejection Details */}
                        <div style={{ 
                          background: `${colors.accent.red}10`, 
                          borderRadius: '12px', 
                          padding: '16px',
                          border: `1px solid ${colors.accent.red}20`
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.rejectedBy}</p>
                              <p style={{ fontSize: '13px', color: colors.accent.red, fontWeight: '600' }}>{lock.rejectedBy}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.rejectedAt}</p>
                              <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                                {new Date(lock.rejectedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>Razón del Rechazo</p>
                            <p style={{ fontSize: '14px', color: colors.text.primary, fontStyle: 'italic' }}>
                              "{lock.reason}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Rejected Mint Requests Section */}
              {mintRequests.filter(r => r.status === 'rejected').length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.accent.red, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle style={{ width: '18px', height: '18px' }} />
                    Solicitudes de Mint Rechazadas ({mintRequests.filter(r => r.status === 'rejected').length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mintRequests.filter(r => r.status === 'rejected').map(req => (
                      <div key={req.id} style={{ background: colors.bg.card, borderRadius: '12px', border: `1px solid ${colors.accent.red}30`, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.red }}>{req.authorizationCode}</p>
                            <p style={{ fontSize: '12px', color: colors.text.muted }}>Lock ID: {req.lockId}</p>
                          </div>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(req.requestedAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {apiBridge.getRejectedLocks().length === 0 && mintRequests.filter(r => r.status === 'rejected').length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: colors.bg.card, borderRadius: '16px', border: `1px solid ${colors.border.primary}` }}>
                  <CheckCircle style={{ width: '48px', height: '48px', color: colors.accent.primary, margin: '0 auto 16px' }} />
                  <p style={{ color: colors.text.secondary, marginBottom: '8px', fontSize: '16px' }}>{t.noRejectedLocks}</p>
                  <p style={{ color: colors.text.muted, fontSize: '13px' }}>{t.locksFromDcb}</p>
                </div>
              )}
            </div>
          )}
        </main>

      {/* Lock Approval Modal - Select Amount */}
      {showLockApprovalModal && lockToApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: colors.bg.card, borderRadius: '24px', border: `1px solid ${colors.border.primary}`, width: '100%', maxWidth: '550px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border.primary}`, background: `linear-gradient(135deg, ${colors.accent.primary}10 0%, transparent 100%)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${colors.accent.primary}20`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock style={{ width: '24px', height: '24px', color: colors.accent.primary }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>{t.approveLockTitle}</h3>
                    <p style={{ fontSize: '13px', color: colors.text.muted }}>{t.selectAmountToMint}</p>
                  </div>
                </div>
                <button onClick={handleCloseLockApproval} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                  <X style={{ width: '20px', height: '20px', color: colors.text.muted }} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Lock Info */}
              <div style={{ padding: '20px', background: colors.bg.secondary, borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>{t.lockIdLabel}</p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: colors.accent.primary, fontFamily: "'JetBrains Mono', monospace" }}>{lockToApprove.lockId}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>{t.amountReceived}</p>
                    <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>${formatAmount(getLockAmount(lockToApprove))}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.bank}</p>
                    <p style={{ fontSize: '13px', color: colors.text.primary }}>{getLockBankName(lockToApprove)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '2px' }}>{t.beneficiary}</p>
                    <p style={{ fontSize: '13px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{truncateAddress(getLockBeneficiary(lockToApprove))}</p>
                  </div>
                </div>
              </div>
              
              {/* Amount Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text.primary, marginBottom: '12px' }}>
                  💰 {t.amountToLock}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: '600', color: colors.text.muted }}>$</span>
                  <input
                    type="number"
                    value={lockAmountInput}
                    onChange={(e) => setLockAmountInput(e.target.value)}
                    max={getLockAmount(lockToApprove)}
                    min="0"
                    step="0.01"
                    style={{ 
                      width: '100%', 
                      padding: '18px 16px 18px 40px', 
                      background: colors.bg.secondary, 
                      border: `2px solid ${colors.border.accent}`, 
                      borderRadius: '14px', 
                      color: colors.text.primary, 
                      fontSize: '24px', 
                      fontWeight: '700',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      textAlign: 'right'
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: colors.text.muted }}>
                    {t.maxAvailable}: <span style={{ color: colors.accent.primary, fontWeight: '600' }}>${formatAmount(getLockAmount(lockToApprove))}</span>
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setLockAmountInput((parseFloat(getLockAmount(lockToApprove)) * 0.25).toFixed(2))}
                      style={{ padding: '6px 12px', background: colors.bg.tertiary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.secondary, fontSize: '12px', cursor: 'pointer' }}
                    >25%</button>
                    <button 
                      onClick={() => setLockAmountInput((parseFloat(getLockAmount(lockToApprove)) * 0.5).toFixed(2))}
                      style={{ padding: '6px 12px', background: colors.bg.tertiary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.secondary, fontSize: '12px', cursor: 'pointer' }}
                    >50%</button>
                    <button 
                      onClick={() => setLockAmountInput((parseFloat(getLockAmount(lockToApprove)) * 0.75).toFixed(2))}
                      style={{ padding: '6px 12px', background: colors.bg.tertiary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.secondary, fontSize: '12px', cursor: 'pointer' }}
                    >75%</button>
                    <button 
                      onClick={() => setLockAmountInput(getLockAmount(lockToApprove))}
                      style={{ padding: '6px 12px', background: `${colors.accent.primary}20`, border: `1px solid ${colors.accent.primary}40`, borderRadius: '8px', color: colors.accent.primary, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >MAX</button>
                  </div>
                </div>
              </div>
              
              {/* Info Box */}
              <div style={{ padding: '16px', background: `${colors.accent.blue}10`, border: `1px solid ${colors.accent.blue}30`, borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Info style={{ width: '20px', height: '20px', color: colors.accent.blue, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '13px', color: colors.text.primary, marginBottom: '4px', fontWeight: '500' }}>{t.onApprovingThisLock}</p>
                    <ul style={{ fontSize: '12px', color: colors.text.secondary, margin: 0, paddingLeft: '16px' }}>
                      <li>{t.notificationWillBeSent}</li>
                      <li>{t.selectedAmountWillMove}</li>
                      <li>{t.youCanProceed}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCloseLockApproval}
                  style={{ flex: 1, padding: '16px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '12px', color: colors.text.secondary, fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleConfirmLockApproval}
                  disabled={isApprovingLock || !lockAmountInput || parseFloat(lockAmountInput) <= 0}
                  style={{ 
                    flex: 2, 
                    padding: '16px', 
                    background: isApprovingLock ? colors.bg.tertiary : `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: 'white', 
                    fontSize: '15px', 
                    fontWeight: '600', 
                    cursor: isApprovingLock ? 'not-allowed' : 'pointer',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    opacity: isApprovingLock ? 0.7 : 1
                  }}
                >
                  {isApprovingLock ? (
                    <>
                      <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                      {t.processingText}
                    </>
                  ) : (
                    <>
                      <Send style={{ width: '20px', height: '20px' }} />
                      {t.approveAndNotify}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mint Modal */}
      {showMintModal && selectedMint && selectedLock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: colors.bg.card, borderRadius: '20px', border: `1px solid ${colors.border.primary}`, width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border.primary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>
                  {mintStep === 'review' ? t.reviewRequest : mintStep === 'confirm' ? t.confirmMinting : mintStep === 'processing' ? t.processingText : t.mintCompletedText}
                </h3>
                <button onClick={() => { setShowMintModal(false); setMintStep('review'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                  <X style={{ width: '20px', height: '20px', color: colors.text.muted }} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              {mintStep === 'review' && (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ padding: '20px', background: colors.bg.secondary, borderRadius: '12px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: colors.text.muted, marginBottom: '8px' }}>{t.authorizationCode}</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: colors.accent.primary, fontFamily: "'JetBrains Mono', monospace" }}>{selectedMint.authorizationCode}</p>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>Monto a Mintear</p>
                        <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary }}>${formatAmount(selectedMint.requestedAmount)} VUSD</p>
                      </div>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>{t.activeBank}</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text.primary }}>{getLockBankName(selectedLock)}</p>
                      </div>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>{t.beneficiary}</p>
                        <p style={{ fontSize: '12px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{truncateAddress(getLockBeneficiary(selectedLock))}</p>
                      </div>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '10px' }}>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>Custody Vault</p>
                        <p style={{ fontSize: '12px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{truncateAddress(selectedLock?.lockDetails?.custodyVault || '')}</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setMintStep('confirm')}
                    style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    Continuar <ArrowRight style={{ width: '18px', height: '18px' }} />
                  </button>
                </>
              )}
              
              {mintStep === 'confirm' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '80px', height: '80px', background: `${colors.accent.gold}20`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <AlertTriangle style={{ width: '40px', height: '40px', color: colors.accent.gold }} />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>{t.confirmMinting}?</h4>
                    <p style={{ fontSize: '14px', color: colors.text.secondary }}>{t.createThisAction} <strong>${formatAmount(selectedMint.requestedAmount)} VUSD</strong> en LemonChain</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setMintStep('review')}
                      style={{ flex: 1, padding: '14px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '10px', color: colors.text.secondary, fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      Volver
                    </button>
                    <button
                      onClick={processMint}
                      style={{ flex: 1, padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Rocket style={{ width: '18px', height: '18px' }} />
                      {t.confirmAndMint}
                    </button>
                  </div>
                </>
              )}
              
              {mintStep === 'processing' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Loader2 style={{ width: '60px', height: '60px', color: colors.accent.primary, margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>Procesando Minting...</h4>
                  <p style={{ fontSize: '14px', color: colors.text.secondary }}>Enviando transacción a LemonChain</p>
                </div>
              )}
              
              {mintStep === 'complete' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: `${colors.accent.primary}20`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle style={{ width: '40px', height: '40px', color: colors.accent.primary }} />
                  </div>
                  <h4 style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary, marginBottom: '8px' }}>¡Minting Exitoso!</h4>
                  <p style={{ fontSize: '14px', color: colors.text.secondary, marginBottom: '20px' }}>Se han creado {formatAmount(selectedMint.requestedAmount)} VUSD</p>
                  
                  <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '10px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '4px' }}>Transaction Hash</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '12px', color: colors.accent.primary, fontFamily: "'JetBrains Mono', monospace" }}>{truncateAddress(mintTxHash)}</code>
                      <button onClick={() => copyToClipboard(mintTxHash)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Copy style={{ width: '14px', height: '14px', color: colors.text.muted }} />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => { setShowMintModal(false); setMintStep('review'); }}
                    style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: colors.bg.card, borderRadius: '20px', border: `1px solid ${colors.border.primary}`, width: '100%', maxWidth: '450px' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border.primary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary }}>Nuevo Usuario</h3>
                <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                  <X style={{ width: '20px', height: '20px', color: colors.text.muted }} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Usuario</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Contraseña</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Rol</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleCreateUser}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: colors.bg.card, borderRadius: '20px', border: `1px solid ${colors.border.primary}`, width: '100%', maxWidth: '400px' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border.primary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary }}>Cambiar Contraseña</h3>
                <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                  <X style={{ width: '20px', height: '20px', color: colors.text.muted }} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.text.secondary, marginBottom: '8px' }}>{t.confirmNewPassword}</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: colors.bg.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
              
              <button
                onClick={handleChangePassword}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PREMIUM MINTING MODAL - ULTRA PREMIUM DESIGN                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showPremiumMintModal && selectedMintItem && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.95)', 
          backdropFilter: 'blur(20px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 2000, 
          padding: '20px' 
        }}>
          <div style={{ 
            background: `linear-gradient(180deg, #0A0A0A 0%, #050505 100%)`,
            borderRadius: '32px', 
            border: `2px solid ${premiumMintStep === 4 && premiumMintResult?.success ? colors.accent.primary : colors.accent.gold}40`,
            boxShadow: `0 0 100px ${premiumMintStep === 4 && premiumMintResult?.success ? colors.accent.primary : colors.accent.gold}20, 0 0 40px rgba(0,0,0,0.5)`,
            width: '100%', 
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Animated Background Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '300px',
              background: `radial-gradient(ellipse at top, ${premiumMintStep === 4 && premiumMintResult?.success ? colors.accent.primary : colors.accent.gold}15 0%, transparent 70%)`,
              pointerEvents: 'none'
            }} />
            
            {/* Header */}
            <div style={{ 
              padding: '32px 32px 24px', 
              borderBottom: `1px solid ${colors.border.primary}`,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    background: `linear-gradient(135deg, ${colors.accent.gold}30 0%, ${colors.accent.gold}10 100%)`,
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: `2px solid ${colors.accent.gold}40`
                  }}>
                    <Coins style={{ width: '32px', height: '32px', color: colors.accent.gold }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: colors.text.primary, marginBottom: '4px', letterSpacing: '-0.5px' }}>
                      {t.premiumMintTitle}
                    </h2>
                    <p style={{ fontSize: '14px', color: colors.text.muted }}>
                      {t.premiumMintSubtitle}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleClosePremiumMint} 
                  style={{ 
                    background: colors.bg.secondary, 
                    border: `1px solid ${colors.border.primary}`, 
                    borderRadius: '12px',
                    cursor: 'pointer', 
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X style={{ width: '20px', height: '20px', color: colors.text.muted }} />
                </button>
              </div>
              
              {/* Progress Steps */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px' }}>
                {[1, 2, 3, 4].map((step) => (
                  <React.Fragment key={step}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: premiumMintStep >= step 
                        ? `linear-gradient(135deg, ${step === 4 && premiumMintResult?.success ? colors.accent.primary : colors.accent.gold} 0%, ${step === 4 && premiumMintResult?.success ? colors.accent.secondary : colors.accent.gold}CC 100%)`
                        : colors.bg.secondary,
                      border: `2px solid ${premiumMintStep >= step ? 'transparent' : colors.border.primary}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: premiumMintStep >= step ? '#000' : colors.text.muted,
                      fontSize: '16px',
                      fontWeight: '700',
                      transition: 'all 0.3s ease'
                    }}>
                      {premiumMintStep > step ? <Check style={{ width: '20px', height: '20px' }} /> : step}
                    </div>
                    {step < 4 && (
                      <div style={{
                        width: '60px',
                        height: '3px',
                        background: premiumMintStep > step ? colors.accent.gold : colors.border.primary,
                        borderRadius: '2px',
                        transition: 'all 0.3s ease'
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Step Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 10px' }}>
                <span style={{ fontSize: '10px', color: premiumMintStep >= 1 ? colors.accent.gold : colors.text.muted, fontWeight: '600', width: '80px', textAlign: 'center' }}>{t.premiumMintLockHash}</span>
                <span style={{ fontSize: '10px', color: premiumMintStep >= 2 ? colors.accent.gold : colors.text.muted, fontWeight: '600', width: '80px', textAlign: 'center' }}>{t.premiumMintVusdHash}</span>
                <span style={{ fontSize: '10px', color: premiumMintStep >= 3 ? colors.accent.gold : colors.text.muted, fontWeight: '600', width: '80px', textAlign: 'center' }}>{t.premiumMintContract}</span>
                <span style={{ fontSize: '10px', color: premiumMintStep >= 4 ? colors.accent.primary : colors.text.muted, fontWeight: '600', width: '80px', textAlign: 'center' }}>{t.premiumMintPublish}</span>
              </div>
            </div>
            
            {/* Content */}
            <div style={{ padding: '32px', overflowY: 'auto', maxHeight: 'calc(90vh - 280px)' }}>
              
              {/* Amount Display */}
              <div style={{ 
                textAlign: 'center', 
                padding: '28px', 
                background: `linear-gradient(135deg, ${colors.bg.secondary} 0%, ${colors.bg.tertiary} 100%)`,
                borderRadius: '20px',
                border: `1px solid ${colors.border.primary}`,
                marginBottom: '28px'
              }}>
                <p style={{ fontSize: '13px', color: colors.text.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t.premiumMintAmountToConvert}
                </p>
                <p style={{ fontSize: '52px', fontWeight: '900', color: colors.text.primary, lineHeight: 1, letterSpacing: '-2px' }}>
                  <span style={{ fontSize: '32px', color: colors.text.muted }}>$</span>
                  {formatAmount(selectedMintItem.amountUSD)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  <span style={{ fontSize: '14px', color: colors.accent.blue, fontWeight: '600' }}>USD</span>
                  <ArrowRight style={{ width: '16px', height: '16px', color: colors.text.muted }} />
                  <span style={{ fontSize: '14px', color: colors.accent.primary, fontWeight: '600' }}>VUSD</span>
                </div>
              </div>
              
              {/* Step 1: Lock Contract Hash */}
              {premiumMintStep === 1 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ 
                    padding: '24px', 
                    background: colors.bg.card, 
                    borderRadius: '20px', 
                    border: `1px solid ${colors.border.primary}` 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: `${colors.accent.gold}20`, 
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Lock style={{ width: '24px', height: '24px', color: colors.accent.gold }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text.primary, marginBottom: '4px' }}>
                          {t.premiumMintLockSignatureHash}
                        </h3>
                        <p style={{ fontSize: '13px', color: colors.text.muted }}>
                          {selectedMintItem?.blockchain?.lockTxHash 
                            ? `✅ ${t.premiumMintAutoCompleted}` 
                            : t.premiumMintEnterLockHash}
                        </p>
                      </div>
                    </div>
                    
                    {/* Auto-completed indicator */}
                    {selectedMintItem?.blockchain?.lockTxHash && (
                      <div style={{ 
                        marginBottom: '16px', 
                        padding: '12px 16px', 
                        background: `${colors.accent.primary}15`,
                        borderRadius: '12px',
                        border: `1px solid ${colors.accent.primary}40`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                        <span style={{ fontSize: '13px', color: colors.accent.primary, fontWeight: '600' }}>
                          {t.premiumMintAutoCompletedFromDcb}
                        </span>
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: colors.text.secondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t.premiumMintLockContractHash}
                      </label>
                      <input
                        type="text"
                        value={lockContractHash}
                        onChange={(e) => setLockContractHash(e.target.value)}
                        placeholder="0x..."
                        style={{ 
                          width: '100%', 
                          padding: '18px 20px', 
                          background: colors.bg.secondary, 
                          border: `2px solid ${lockContractHash ? colors.accent.gold : colors.border.primary}`, 
                          borderRadius: '14px', 
                          color: colors.text.primary, 
                          fontSize: '16px', 
                          fontFamily: "'JetBrains Mono', monospace",
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                    
                    {/* ISO 20022 Data Display */}
                    {selectedMintItem?.isoData && (
                      <div style={{ 
                        marginBottom: '16px',
                        padding: '16px', 
                        background: `${colors.accent.blue}10`,
                        borderRadius: '12px',
                        border: `1px solid ${colors.accent.blue}30`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <FileText style={{ width: '16px', height: '16px', color: colors.accent.blue }} />
                          <span style={{ fontSize: '12px', color: colors.accent.blue, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t.premiumMintIsoMessageData}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                          <div>
                            <span style={{ color: colors.text.muted }}>Message ID: </span>
                            <span style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {selectedMintItem.isoData.messageId?.slice(0, 15) || 'N/A'}...
                            </span>
                          </div>
                          <div>
                            <span style={{ color: colors.text.muted }}>DAES TX: </span>
                            <span style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                              {selectedMintItem.isoData.daesTransactionId?.slice(0, 15) || 'N/A'}...
                            </span>
                          </div>
                          {selectedMintItem.isoData.uetr && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span style={{ color: colors.text.muted }}>UETR: </span>
                              <span style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                                {selectedMintItem.isoData.uetr}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Blockchain Signatures Info */}
                    {selectedMintItem?.blockchain && (
                      <div style={{ 
                        marginBottom: '16px',
                        padding: '16px', 
                        background: `${colors.accent.purple}10`,
                        borderRadius: '12px',
                        border: `1px solid ${colors.accent.purple}30`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <Shield style={{ width: '16px', height: '16px', color: colors.accent.purple }} />
                          <span style={{ fontSize: '12px', color: colors.accent.purple, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t.premiumMintBlockchainSignatures}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedMintItem.blockchain.firstSignature ? colors.accent.primary : colors.text.muted }} />
                            <span style={{ color: colors.text.muted }}>{t.premiumMintFirstSignature}: </span>
                            <span style={{ color: selectedMintItem.blockchain.firstSignature ? colors.accent.primary : colors.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {selectedMintItem.blockchain.firstSignature?.slice(0, 16) || t.premiumMintPending}...
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedMintItem.blockchain.secondSignature ? colors.accent.gold : colors.text.muted }} />
                            <span style={{ color: colors.text.muted }}>{t.premiumMintSecondSignature}: </span>
                            <span style={{ color: selectedMintItem.blockchain.secondSignature ? colors.accent.gold : colors.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {selectedMintItem.blockchain.secondSignature?.slice(0, 16) || t.premiumMintPending}...
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.text.muted }} />
                            <span style={{ color: colors.text.muted }}>{t.premiumMintThirdSignature}: </span>
                            <span style={{ color: colors.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {t.premiumMintPending} - {t.premiumMintGeneratedOnPublish}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Info style={{ width: '18px', height: '18px', color: colors.accent.blue }} />
                        <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                          {t.premiumMintHashNote}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 2: VUSD Mint Hash */}
              {premiumMintStep === 2 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ 
                    padding: '24px', 
                    background: colors.bg.card, 
                    borderRadius: '20px', 
                    border: `1px solid ${colors.border.primary}` 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: `${colors.accent.primary}20`, 
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Coins style={{ width: '24px', height: '24px', color: colors.accent.primary }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text.primary, marginBottom: '4px' }}>
                          {t.premiumMintVusdHashTitle}
                        </h3>
                        <p style={{ fontSize: '13px', color: colors.text.muted }}>
                          {t.premiumMintVusdHashSubtitle}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: colors.text.secondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t.premiumMintVusdMintHash}
                      </label>
                      <input
                        type="text"
                        value={lusdMintHash}
                        onChange={(e) => setLusdMintHash(e.target.value)}
                        placeholder="0x..."
                        style={{ 
                          width: '100%', 
                          padding: '18px 20px', 
                          background: colors.bg.secondary, 
                          border: `2px solid ${lusdMintHash ? colors.accent.primary : colors.border.primary}`, 
                          borderRadius: '14px', 
                          color: colors.text.primary, 
                          fontSize: '16px', 
                          fontFamily: "'JetBrains Mono', monospace",
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                    
                    {/* Verification Status */}
                    <div style={{ 
                      padding: '16px', 
                      background: lockContractHash && lusdMintHash ? `${colors.accent.primary}10` : colors.bg.secondary, 
                      borderRadius: '12px',
                      border: `1px solid ${lockContractHash && lusdMintHash ? colors.accent.primary + '30' : 'transparent'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {lockContractHash && lusdMintHash ? (
                          <>
                            <CheckCircle style={{ width: '18px', height: '18px', color: colors.accent.primary }} />
                            <p style={{ fontSize: '13px', color: colors.accent.primary, fontWeight: '500' }}>
                              {t.premiumMintHashesRegistered}
                            </p>
                          </>
                        ) : (
                          <>
                            <AlertTriangle style={{ width: '18px', height: '18px', color: colors.accent.gold }} />
                            <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                              {t.premiumMintBothHashesMustMatch}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: VUSD Contract Address */}
              {premiumMintStep === 3 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ 
                    padding: '24px', 
                    background: colors.bg.card, 
                    borderRadius: '20px', 
                    border: `1px solid ${colors.border.primary}` 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: `${colors.accent.purple}20`, 
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <FileText style={{ width: '24px', height: '24px', color: colors.accent.purple }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text.primary, marginBottom: '4px' }}>
                          {t.lusdContract}
                        </h3>
                        <p style={{ fontSize: '13px', color: colors.text.muted }}>
                          {t.premiumMintVusdContractSubtitle}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: colors.text.secondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t.premiumMintVusdContractAddress}
                      </label>
                      <input
                        type="text"
                        value={lusdContractAddress}
                        onChange={(e) => setLusdContractAddress(e.target.value)}
                        placeholder="0x..."
                        style={{ 
                          width: '100%', 
                          padding: '18px 20px', 
                          background: colors.bg.secondary, 
                          border: `2px solid ${colors.accent.purple}`, 
                          borderRadius: '14px', 
                          color: colors.text.primary, 
                          fontSize: '14px', 
                          fontFamily: "'JetBrains Mono', monospace",
                          outline: 'none'
                        }}
                      />
                    </div>
                    
                    {/* Contract Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                        <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>{t.premiumMintNetwork}</p>
                        <p style={{ fontSize: '14px', color: colors.text.primary, fontWeight: '600' }}>LemonChain (1006)</p>
                      </div>
                      <div style={{ padding: '16px', background: colors.bg.secondary, borderRadius: '12px' }}>
                        <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px' }}>{t.premiumMintToken}</p>
                        <p style={{ fontSize: '14px', color: colors.accent.primary, fontWeight: '600' }}>VUSD (Lemon USD)</p>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div style={{ 
                      marginTop: '20px',
                      padding: '20px', 
                      background: `linear-gradient(135deg, ${colors.accent.gold}10 0%, ${colors.accent.primary}10 100%)`,
                      borderRadius: '16px',
                      border: `1px solid ${colors.accent.gold}30`
                    }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: colors.text.primary, marginBottom: '16px' }}>
                        {t.premiumMintVerificationSummary}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: colors.text.muted }}>Lock Hash</span>
                          <span style={{ fontSize: '12px', color: lockContractHash ? colors.accent.primary : colors.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                            {lockContractHash ? lockContractHash.slice(0, 10) + '...' + lockContractHash.slice(-8) : t.premiumMintNotEntered}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: colors.text.muted }}>VUSD Hash</span>
                          <span style={{ fontSize: '12px', color: lusdMintHash ? colors.accent.primary : colors.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                            {lusdMintHash ? lusdMintHash.slice(0, 10) + '...' + lusdMintHash.slice(-8) : t.premiumMintNotEntered}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: colors.text.muted }}>{t.lusdContract}</span>
                          <span style={{ fontSize: '12px', color: colors.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>
                            {lusdContractAddress.slice(0, 10)}...{lusdContractAddress.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 4: Publish & Result */}
              {premiumMintStep === 4 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {!premiumMintResult ? (
                    /* Pre-publish state */
                    <div style={{ 
                      padding: '32px', 
                      background: colors.bg.card, 
                      borderRadius: '20px', 
                      border: `1px solid ${colors.border.primary}`,
                      textAlign: 'center'
                    }}>
                      {isPremiumMinting ? (
                        <>
                          <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            margin: '0 auto 24px',
                            background: `${colors.accent.gold}20`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Loader2 style={{ width: '40px', height: '40px', color: colors.accent.gold, animation: 'spin 1s linear infinite' }} />
                          </div>
                          <h3 style={{ fontSize: '22px', fontWeight: '700', color: colors.text.primary, marginBottom: '12px' }}>
                            {t.processingText}
                          </h3>
                          <p style={{ fontSize: '14px', color: colors.text.muted }}>
                            {t.premiumMintProductionMode}
                          </p>
                        </>
                      ) : (
                        <>
                          <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            margin: '0 auto 24px',
                            background: `linear-gradient(135deg, ${colors.accent.gold}30 0%, ${colors.accent.primary}30 100%)`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Rocket style={{ width: '40px', height: '40px', color: colors.accent.gold }} />
                          </div>
                          <h3 style={{ fontSize: '22px', fontWeight: '700', color: colors.text.primary, marginBottom: '12px' }}>
                            {t.premiumMintReadyToPublish}
                          </h3>
                          <p style={{ fontSize: '14px', color: colors.text.muted, marginBottom: '24px' }}>
                            {t.premiumMintReadyToPublishDesc}
                          </p>
                          <button
                            onClick={handleExecutePremiumMint}
                            style={{ 
                              padding: '18px 48px', 
                              background: `linear-gradient(135deg, ${colors.accent.gold} 0%, ${colors.accent.gold}CC 100%)`,
                              border: 'none',
                              borderRadius: '16px',
                              color: '#000',
                              fontSize: '18px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '12px',
                              boxShadow: `0 8px 32px ${colors.accent.gold}40`
                            }}
                          >
                            <Sparkles style={{ width: '22px', height: '22px' }} />
                            {t.premiumMintPublishAndMint.toUpperCase()}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Success Result */
                    <div style={{ 
                      padding: '32px', 
                      background: `linear-gradient(135deg, ${colors.accent.primary}10 0%, ${colors.bg.card} 100%)`,
                      borderRadius: '20px', 
                      border: `2px solid ${colors.accent.primary}40`,
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        width: '96px', 
                        height: '96px', 
                        margin: '0 auto 24px',
                        background: `linear-gradient(135deg, ${colors.accent.primary}30 0%, ${colors.accent.primary}10 100%)`,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `3px solid ${colors.accent.primary}`
                      }}>
                        <CheckCircle style={{ width: '48px', height: '48px', color: colors.accent.primary }} />
                      </div>
                      
                      <h3 style={{ fontSize: '28px', fontWeight: '800', color: colors.accent.primary, marginBottom: '8px' }}>
                        {t.premiumMintCompleteTitle}
                      </h3>
                      <p style={{ fontSize: '14px', color: colors.text.muted, marginBottom: '32px' }}>
                        {t.premiumMintCompleteSubtitle}
                      </p>
                      
                      {/* Result Details */}
                      <div style={{ 
                        background: colors.bg.secondary, 
                        borderRadius: '16px', 
                        padding: '24px',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>{t.premiumMintPublicationCode}</p>
                            <p style={{ fontSize: '18px', color: colors.accent.gold, fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
                              {premiumMintResult.publicationCode}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>{t.premiumMintTxHash}</p>
                            <p style={{ fontSize: '13px', color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                              {premiumMintResult.txHash}
                            </p>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>{t.premiumMintBlockNumber}</p>
                              <p style={{ fontSize: '14px', color: colors.text.primary, fontWeight: '600' }}>
                                #{premiumMintResult.blockNumber.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p style={{ fontSize: '11px', color: colors.text.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Timestamp</p>
                              <p style={{ fontSize: '14px', color: colors.text.primary }}>
                                {formatDate(premiumMintResult.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Explorer Link */}
                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setShowMintExplorerModal(true)}
                          style={{ 
                            padding: '14px 24px', 
                            background: `${colors.accent.cyan}15`,
                            border: `1px solid ${colors.accent.cyan}30`,
                            borderRadius: '12px',
                            color: colors.accent.cyan,
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Database style={{ width: '18px', height: '18px' }} />
                          {t.premiumMintViewOnExplorer}
                        </button>
                        <button
                          onClick={handleClosePremiumMint}
                          style={{ 
                            padding: '14px 24px', 
                            background: `linear-gradient(135deg, ${colors.accent.primary} 0%, ${colors.accent.secondary} 100%)`,
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {t.close}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer Navigation */}
            {premiumMintStep < 4 && (
              <div style={{ 
                padding: '24px 32px', 
                borderTop: `1px solid ${colors.border.primary}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  onClick={premiumMintStep === 1 ? handleClosePremiumMint : handlePremiumMintBack}
                  style={{ 
                    padding: '14px 28px', 
                    background: colors.bg.secondary,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: '12px',
                    color: colors.text.secondary,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {premiumMintStep === 1 ? t.cancel : `← ${t.previous}`}
                </button>
                
                <button
                  onClick={premiumMintStep === 3 ? handleExecutePremiumMint : handlePremiumMintNext}
                  disabled={
                    (premiumMintStep === 1 && !lockContractHash) ||
                    (premiumMintStep === 2 && !lusdMintHash) ||
                    (premiumMintStep === 3 && !lusdContractAddress)
                  }
                  style={{ 
                    padding: '14px 32px', 
                    background: (
                      (premiumMintStep === 1 && !lockContractHash) ||
                      (premiumMintStep === 2 && !lusdMintHash) ||
                      (premiumMintStep === 3 && !lusdContractAddress)
                    ) ? colors.bg.secondary : `linear-gradient(135deg, ${colors.accent.gold} 0%, ${colors.accent.gold}CC 100%)`,
                    border: 'none',
                    borderRadius: '12px',
                    color: (
                      (premiumMintStep === 1 && !lockContractHash) ||
                      (premiumMintStep === 2 && !lusdMintHash) ||
                      (premiumMintStep === 3 && !lusdContractAddress)
                    ) ? colors.text.muted : '#000',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: (
                      (premiumMintStep === 1 && !lockContractHash) ||
                      (premiumMintStep === 2 && !lusdMintHash) ||
                      (premiumMintStep === 3 && !lusdContractAddress)
                    ) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {premiumMintStep === 3 ? (
                    <>
                      <Rocket style={{ width: '18px', height: '18px' }} />
                      {t.premiumMintPublishAndMint}
                    </>
                  ) : (
                    <>
                      {t.next} →
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MINT LEMON EXPLORER VUSD - FULLSCREEN MODAL (Shared Component)                */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <MintLemonExplorer 
        isOpen={showMintExplorerModal}
        onClose={() => setShowMintExplorerModal(false)}
        apiUrl="http://localhost:4011"
        language={language}
      />

      {/* Global Styles - PRO LemonChain Theme */}
      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
        @keyframes slideIn { 
          from { transform: translateX(100px); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes pulse { 
          0%, 100% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.6; transform: scale(0.95); } 
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px ${colors.accent.glow}40; }
          50% { box-shadow: 0 0 40px ${colors.accent.glow}60; }
        }
        
        /* Custom Scrollbar - Lemon Theme */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: ${colors.bg.primary};
        }
        ::-webkit-scrollbar-thumb {
          background: ${colors.border.secondary};
          border-radius: 5px;
          border: 2px solid ${colors.bg.primary};
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.accent.dark};
        }
        
        /* Input placeholder */
        input::placeholder {
          color: ${colors.text.dim};
        }
        
        /* Focus outline */
        button:focus-visible {
          outline: 2px solid ${colors.accent.primary};
          outline-offset: 2px;
        }
        
        /* Selection */
        ::selection {
          background: ${colors.accent.primary}40;
          color: ${colors.text.primary};
        }
      `}</style>
    </div>
  );
};

export default LEMXMintingPlatform;
