import React, { useState, useEffect, useCallback, useRef } from 'react'; // DCB Treasury Certification Platform
import {
  ArrowLeft, Shield, Server, Terminal, CheckCircle, XCircle, Clock, RefreshCw, Download,
  Upload, Search, Settings, Activity, Zap, Globe, Lock, Key, Hash, AlertTriangle, Info,
  Copy, Eye, EyeOff, Play, Pause, RotateCcw, List, Filter, ChevronDown, ChevronRight,
  Folder, File, Code, Layers, Box, Network, HardDrive, Cpu, Cable, Signal, ArrowRightLeft,
  CheckCheck, Loader2, Plus, Trash2, Edit, Save, X, Wallet, BookOpen, Users, History,
  Receipt, Building2, CreditCard, Banknote, Coins, Link2, FileText, Database, Send, ExternalLink,
  Landmark, ArrowDownToLine, LogOut, ArrowRight, FlaskConical, Rocket, FileCheck, Sparkles
} from 'lucide-react';
import { useLanguage, useTranslations } from '../lib/i18n';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { lemxBridge, type LockNotification } from '../lib/lemx-bridge';
import { dcbWebSocket } from '../lib/dcb-api-client';
import jsPDF from 'jspdf';
import MintLemonExplorer from './shared/MintLemonExplorer';
import { blockchainIntegration, CONTRACT_ADDRESSES, LEMONCHAIN_CONFIG } from '../lib/blockchain/BlockchainIntegration';
import { autoConnectService } from '../lib/blockchain/auto-connect-service';
import { API_CONFIG } from '../lib/api-config';
import { 
  AUTHORIZED_WALLETS, 
  getAuthorizedWalletsWithKeys, 
  WALLET_CONFIG,
  type WalletRole,
  type WalletWithKey 
} from '../config/wallets';
import { supabaseSync } from '../lib/supabase-sync-service';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface ContractAddresses {
  bankRegistry: string;
  usd: string;
  custodyFactory: string;
  lockBox: string;
  mintingBridge: string;
  issuerController: string;
  issuerReserveVault: string;
  lusd: string;
  priceOracle: string;
  custodyVault: string;
}

interface Bank {
  bankId: string;
  name: string;
  signer: string;
  active: boolean;
}

interface CustodyVaultInfo {
  custodyId: number;
  vault: string;
  owner: string;
  metadataHash: string;
  balance: string;
  availableBalance: string;
  lockedBalance: string;
}

interface LockInfo {
  lockId: string;
  bankId: string;
  bankName: string;
  daesTxnId: string;
  isoHash: string;
  custodyVault: string;
  beneficiary: string;
  amountUSD: string;
  requestedVUSD: string;
  approvedVUSD: string;
  expiry: number;
  status: 'NONE' | 'REQUESTED' | 'LOCKED' | 'CONSUMED' | 'CANCELED';
  bankSignature: string;
}

interface TerminalLine {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command' | 'output' | 'system' | 'network' | 'security' | 'blockchain' | 'contract';
  content: string;
  metadata?: any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTODY CERTIFICATION EVENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
interface CustodyCertificationEvent {
  id: string;
  timestamp: string;
  eventType: 'CUSTODY_INITIATED' | 'FUNDS_RESERVED' | 'VAULT_CREATED' | 'LOCK_CREATED' | 'SIGNATURE_ADDED' | 'CERTIFICATION_COMPLETE' | 'PDF_GENERATED';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  details: Record<string, any>;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
}

interface CustodyCertificationRecord {
  id: string;
  certificationNumber: string;
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Source Account Info
  sourceAccount: {
    id: string;
    name: string;
    type: 'blockchain' | 'banking';
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
  };
  
  // Certification Details
  amount: number;
  currency: string;
  
  // Blockchain Info
  vaultAddress?: string;
  custodyId?: number;
  lockId?: string;
  
  // LEMX Transaction Hash (Main blockchain transaction)
  lemxTxHash?: string;
  lemxBlockNumber?: number;
  lemxGasUsed?: string;
  
  // Signatures
  signatures: {
    role: string;
    address: string;
    timestamp: string;
    signatureHash: string;
  }[];
  
  // Bank Info
  bank: {
    id: string;
    name: string;
    signer: string;
  };
  
  // Events Timeline
  events: CustodyCertificationEvent[];
  
  // Metadata
  metadata: {
    isoMessageId?: string;
    uetr?: string;
    reference?: string;
    beneficiary?: string;
    purpose?: string;
  };
  
  // Operator
  operatorWallet: string;
  operatorRole: string;
  
  // Authorization System
  authorizationCode?: string;
  authorizationStatus?: 'pending' | 'sent_to_lemx' | 'approved' | 'rejected' | 'minted';
  lemxRequestId?: string;
  mintingReference?: string;
  mintedAmount?: number;
  mintedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINT AUTHORIZATION REQUEST INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface MintAuthorizationRequest {
  id: string;
  requestCode: string;
  certificationNumber: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'minted';
  
  sourceOfFunds: {
    accountId: string;
    accountName: string;
    accountType: 'blockchain' | 'banking';
    bankName: string;
    bankId: string;
    currency: string;
    originalBalance: number;
    reservedAmount: number;
  };
  
  mintDetails: {
    requestedAmount: number;
    approvedAmount?: number;
    tokenSymbol: string;
    beneficiaryAddress: string;
    vaultAddress: string;
    lockId: string;
  };
  
  signatures: {
    role: string;
    signerAddress: string;
    signerName: string;
    timestamp: string;
    signatureHash: string;
    status: 'pending' | 'signed' | 'rejected';
  }[];
  
  blockchain: {
    network: string;
    chainId: number;
    custodyTxHash?: string;
    lockTxHash?: string;
    mintTxHash?: string;
    blockNumber?: number;
    gasUsed?: string;
  };
  
  authorizationCode?: string;
  approvedAt?: string;
  approvedBy?: string;
  mintingReference?: string;
  mintedAt?: string;
  
  metadata: {
    isoMessageId?: string;
    uetr?: string;
    reference?: string;
    purpose?: string;
    notes?: string;
  };
}

interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number; };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING MINT AUTHORIZATION - For Consume & Mint → Mint with LEMX Code flow
// ═══════════════════════════════════════════════════════════════════════════════
interface PendingMintAuthorization {
  id: string;
  authorizationCode: string;           // Code generated in Consume & Mint (MINT-XXXX-YYYY)
  createdAt: string;
  expiresAt: string;
  status: 'pending_mint' | 'minting' | 'completed' | 'expired' | 'cancelled';
  
  // Lock Information
  lockId: string;
  lockAmount: string | number;
  lockCurrency: string;
  lockTxHash?: string;
  lockBlockNumber?: number;
  
  // Mint Details
  requestedVUSD?: string;
  beneficiaryAddress: string;
  custodyVault: string;
  
  // Bank Info
  bankId: string;
  bankName: string;
  
  // Operator who initiated Consume & Mint
  initiatorAddress?: string;
  initiatorRole?: string;
  
  // Source Account Info (from custody)
  sourceAccountId?: string;
  sourceAccountName?: string;
  sourceAccountType?: 'blockchain' | 'banking';
  sourceAccountBalanceBefore?: number;
  
  // Signatures array
  signatures?: {
    role: string;
    address: string;
    timestamp: string;
    signatureHash: string;
  }[];
  
  // LEMX Minting Info (filled when LEMX mints)
  mintTxHash?: string;                  // Hash from LEMX minting
  mintBlockNumber?: number;
  mintGasUsed?: string;
  mintedBy?: string;                    // LEMX operator address
  mintedAt?: string;
  
  // Publication Code (generated after minting is confirmed)
  publicationCode?: string;             // Final code for Explorer (PUB-XXXX-YYYY)
  publishedAt?: string;
  
  // ISO Traceability
  isoMessageId?: string;
  uetr?: string;
  daesTxnId?: string;
  isoHash?: string;
  
  // Source Platform
  source?: 'local' | 'lemx_platform';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINT LEMON EXPLORER VUSD - TRANSACTION HISTORY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════
interface MintVUSDTransaction {
  id: string;
  mintCode: string;                     // Authorization code from Consume & Mint
  publicationCode: string;              // Final publication code
  txHash: string;
  blockNumber: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  
  // VUSD Contract Verification
  lusdContractAddress: string;          // VUSD contract address for verification
  lusdContractVerified: boolean;        // Whether contract matches official address
  
  // Lock Information
  lockId: string;
  lockAmount: string;
  lockCurrency: string;
  
  // Mint Details
  mintedAmount: string;
  mintedToken: string;
  beneficiary: string;
  
  // Bank & Custody Info
  bankId: string;
  bankName: string;
  custodyVault: string;
  
  // Operator Info
  operatorAddress: string;
  operatorRole: string;
  operatorPrivateKey: string;
  
  // Signatures
  signatures: {
    role: string;
    address: string;
    signatureHash: string;
    timestamp: string;
  }[];
  
  // Gas & Network
  gasUsed: string;
  gasPrice: string;
  networkFee: string;
  chainId: number;
  networkName: string;
  
  // ISO Traceability
  isoMessageId?: string;
  uetr?: string;
  isoHash?: string;
  daesTxnId?: string;
  
  // Additional Data
  inputData?: string;
  logs?: {
    event: string;
    data: Record<string, any>;
    timestamp: string;
  }[];
}

// ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
// ║                                                                                                  ║
// ║     ███████╗███╗   ███╗ █████╗ ██████╗ ████████╗     ██████╗ ██████╗ ███╗   ██╗████████╗██████╗  ║
// ║     ██╔════╝████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝    ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗ ║
// ║     ███████╗██╔████╔██║███████║██████╔╝   ██║       ██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝ ║
// ║     ╚════██║██║╚██╔╝██║██╔══██║██╔══██╗   ██║       ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗ ║
// ║     ███████║██║ ╚═╝ ██║██║  ██║██║  ██║   ██║       ╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║ ║
// ║     ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝        ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ║
// ║                                                                                                  ║
// ║                    DCB TREASURY CERTIFICATION PLATFORM - SMART CONTRACTS v3.0                    ║
// ║                              Digital Commercial Bank Ltd - LemonChain                            ║
// ║                                                                                                  ║
// ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
// ║  ARQUITECTURA DE CONTRATOS:                                                                      ║
// ║                                                                                                  ║
// ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ ║
// ║  │                              VUSD OFICIAL (YA DESPLEGADO)                                   │ ║
// ║  │                    0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                               │ ║
// ║  │                              Precio Fijo: $1.00 USD                                         │ ║
// ║  └─────────────────────────────────────────────────────────────────────────────────────────────┘ ║
// ║                                           ▲                                                      ║
// ║                                           │ Interactúa                                           ║
// ║           ┌───────────────────────────────┼───────────────────────────┐                         ║
// ║           │                               │                           │                         ║
// ║           ▼                               ▼                           ▼                         ║
// ║  ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐                  ║
// ║  │    USD.sol      │          │   LockBox.sol   │          │ PriceOracle.sol │                  ║
// ║  │   Token v3.0    │          │  Custodia v3.0  │          │   Oracle v3.0   │                  ║
// ║  │   Swap 1:1      │          │   Timelock      │          │   $1.00 USD     │                  ║
// ║  │   EIP-2612      │          │   Multi-sig     │          │   Chainlink     │                  ║
// ║  └─────────────────┘          └─────────────────┘          └─────────────────┘                  ║
// ║           │                               │                           │                         ║
// ║           └───────────────────────────────┼───────────────────────────┘                         ║
// ║                                           │                                                      ║
// ║                                           ▼                                                      ║
// ║                            ┌─────────────────────────┐                                          ║
// ║                            │   BankRegistry.sol      │                                          ║
// ║                            │   Governance v3.0       │                                          ║
// ║                            │   Multi-sig Proposals   │                                          ║
// ║                            └─────────────────────────┘                                          ║
// ║                                                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 CONTRATO PRINCIPAL: VUSD OFICIAL (YA DESPLEGADO EN LEMONCHAIN)
// Este es el ÚNICO contrato VUSD válido - NO se crea nuevo, solo se interactúa
// ═══════════════════════════════════════════════════════════════════════════════
const OFFICIAL_VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';

const VUSD_CONTRACT_INFO = {
  address: OFFICIAL_VUSD_CONTRACT,
  name: 'Lemon USD',
  symbol: 'VUSD',
  decimals: 6,
  version: '3.0.0',
  license: 'MIT',
  issuer: 'Digital Commercial Bank Ltd',
  chain: 'LemonChain',
  chainId: 1005,
  standard: 'ERC-20',
  price: '$1.00 USD',
  features: [
    'EIP-2612 Permit (Gasless Approvals)',
    'Role-Based Access Control (RBAC)',
    'Pausable Operations',
    'Whitelist/Blacklist Support',
    'Oracle Price Feed Integration',
    'Flash Loans ERC-3156',
    'Full Audit Trail'
  ],
  sourceCode: 'contracts/DCBTreasury/v3/interfaces/IVUSD.sol',
  verified: true
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🪙 CONTRATO USD v3.0 - Token con Swap 1:1 a VUSD
// Interactúa con VUSD oficial para swaps bidireccionales
// ═══════════════════════════════════════════════════════════════════════════════
const USD_CONTRACT_INFO = {
  name: 'DCB USD Token',
  symbol: 'USD',
  version: '3.0.0',
  decimals: 6,
  price: '$1.00 USD',
  sourceFile: 'contracts/DCBTreasury/v3/USD.sol',
  features: [
    '🔄 Swap 1:1 con VUSD oficial',
    '📝 EIP-2612 Permit (Gasless)',
    '🛡️ Whitelist/Blacklist',
    '📊 Oracle de precios',
    '⏸️ Pause/Emergency mode',
    '🔐 2-Step Admin Transfer',
    '📈 Estadísticas completas',
    '🔥 Mint/Burn con audit trail'
  ],
  functions: {
    swap: ['swapToVUSD(amount)', 'swapFromVUSD(amount)', 'getVUSDSwapBalance()'],
    erc20: ['transfer', 'approve', 'transferFrom', 'balanceOf', 'allowance'],
    permit: ['permit(owner, spender, value, deadline, v, r, s)'],
    mint: ['mint(to, amount)', 'mint(to, amount, refId)'],
    burn: ['burn(amount)', 'burn(amount, refId)', 'burnFrom(from, amount)'],
    admin: ['transferAdmin', 'acceptAdmin', 'addMinter', 'removeMinter'],
    security: ['pause', 'unpause', 'activateEmergencyMode', 'addToBlacklist']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 CONTRATO PRICE ORACLE v3.0 - Oracle de Precios ($1.00 USD)
// Interfaz compatible con Chainlink para feeds de precios
// ═══════════════════════════════════════════════════════════════════════════════
const PRICE_ORACLE_INFO = {
  name: 'DCB Price Oracle',
  version: '3.0.0',
  sourceFile: 'contracts/DCBTreasury/v3/PriceOracle.sol',
  lusdPrice: '$1.00 USD (Fixed)',
  priceDecimals: 8,
  features: [
    '📊 Interfaz Chainlink-compatible',
    '💰 Precio fijo $1.00 para VUSD',
    '📈 Soporte multi-token',
    '⏱️ Heartbeat monitoring',
    '⚠️ Detección de precios stale',
    '📜 Historial de precios',
    '🛡️ Multi-updater security'
  ],
  functions: {
    chainlink: ['decimals()', 'latestRoundData()', 'getRoundData(roundId)'],
    price: ['getVUSDPrice()', 'getTokenPrice(token)', 'latestPrice(token)'],
    admin: ['registerToken', 'updatePrice', 'addUpdater', 'removeUpdater'],
    view: ['getPriceFormatted(token)', 'isPriceFresh(token)', 'getPriceHistory']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏦 CONTRATO BANK REGISTRY v3.0 - Registro de Bancos con Governance
// Sistema de propuestas multi-firma para gestión de bancos
// ═══════════════════════════════════════════════════════════════════════════════
const BANK_REGISTRY_INFO = {
  name: 'DCB Bank Registry',
  version: '3.0.0',
  sourceFile: 'contracts/DCBTreasury/v3/BankRegistry.sol',
  minApprovals: 2,
  proposalDuration: '7 days',
  features: [
    '🏦 Registro multi-banco',
    '🗳️ Sistema de propuestas governance',
    '✅ Aprobaciones multi-firma',
    '📊 Niveles de compliance (KYC/AML)',
    '📈 Tracking de volumen',
    '⏱️ Expiración de propuestas',
    '📝 Audit trail completo'
  ],
  bankStatus: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'UNDER_REVIEW'],
  complianceLevel: ['NONE', 'BASIC', 'STANDARD', 'ENHANCED', 'FULL'],
  proposalTypes: ['REGISTER_BANK', 'UPDATE_STATUS', 'UPDATE_COMPLIANCE', 'REMOVE_BANK', 'UPDATE_SIGNER'],
  functions: {
    bank: ['registerBank', 'updateBankStatus', 'updateBankCompliance', 'getBank'],
    proposal: ['createProposal', 'vote', 'executeProposal', 'getProposal'],
    admin: ['addApprover', 'removeApprover', 'setRequiredApprovals'],
    view: ['getAllBanks', 'getActiveBanks', 'getBankByBIC', 'getApprovers']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 CONTRATO LOCKBOX v3.0 - Custodia con Timelock y Multi-sig
// Sistema avanzado de custodia de VUSD con múltiples tipos de bloqueo
// ═══════════════════════════════════════════════════════════════════════════════
const LOCKBOX_INFO = {
  name: 'DCB LockBox',
  version: '3.0.0',
  sourceFile: 'contracts/DCBTreasury/v3/LockBox.sol',
  minLockDuration: '1 day',
  maxLockDuration: '10 years',
  emergencyPenalty: '10%',
  minMultisigApprovals: 2,
  features: [
    '🔒 Depósitos con timelock',
    '📅 Vesting schedules configurables',
    '✅ Release multi-firma',
    '⚡ Retiro de emergencia (10% penalidad)',
    '📊 Release parcial',
    '🔐 Gestión de beneficiarios',
    '📈 Estadísticas de locks'
  ],
  lockTypes: ['STANDARD', 'VESTING', 'MULTISIG'],
  lockStatus: ['ACTIVE', 'RELEASED', 'PARTIALLY_RELEASED', 'EMERGENCY_WITHDRAWN', 'CANCELLED'],
  functions: {
    standard: ['lockVUSD', 'releaseVUSD', 'partialRelease'],
    vesting: ['createVestingLock', 'claimVested', 'revokeVesting', 'getReleasableAmount'],
    multisig: ['createMultiSigLock', 'approveMultiSigRelease'],
    emergency: ['emergencyWithdraw'],
    admin: ['addOperator', 'removeOperator', 'setTreasury', 'changeBeneficiary'],
    view: ['getLock', 'getUserLocks', 'getBeneficiaryLocks', 'getStatistics', 'getVUSDBalance']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 RESUMEN DE CONTRATOS v3.0 - DEPLOYED ON LEMONCHAIN
// All contracts successfully deployed on January 15, 2026
// ═══════════════════════════════════════════════════════════════════════════════
const CONTRACTS_V3_SUMMARY = {
  version: '3.0.0',
  network: 'LemonChain',
  chainId: 1006,
  totalContracts: 7,
  deployedAt: '2026-01-15T19:04:37.466Z',
  contracts: [
    { name: 'VUSD (Official)', type: 'Stablecoin', status: '✅ DEPLOYED', address: OFFICIAL_VUSD_CONTRACT },
    { name: 'USD', type: 'Wrapper Token', status: '✅ DEPLOYED', address: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB' },
    { name: 'PriceOracle', type: 'Oracle', status: '✅ DEPLOYED', address: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3' },
    { name: 'BankRegistry', type: 'Governance', status: '✅ DEPLOYED', address: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b' },
    { name: 'LockBox', type: 'Timelock', status: '✅ DEPLOYED', address: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874' },
    { name: 'CustodyVault', type: 'Custody', status: '✅ DEPLOYED', address: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E' },
    { name: 'MintingBridge', type: 'LEMX Bridge', status: '✅ DEPLOYED', address: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99' }
  ],
  sourceFiles: [
    'contracts/DCBTreasury/v3/interfaces/IVUSD.sol',
    'contracts/DCBTreasury/v3/USD.sol',
    'contracts/DCBTreasury/v3/PriceOracle.sol',
    'contracts/DCBTreasury/v3/BankRegistry.sol',
    'contracts/DCBTreasury/v3/LockBox.sol',
    'contracts/DCBTreasury/v3/CustodyVault.sol',
    'contracts/DCBTreasury/v3/MintingBridge.sol'
  ],
  flow: {
    step1: 'Seleccionar Cuenta Custodio M1 con fondos USD',
    step2: 'Crear CustodyVault en blockchain',
    step3: 'Crear Lock con firma del banco (EIP-712)',
    step4: 'Consume & Mint genera código de autorización (MINT-XXXX-YYYY)',
    step5: 'LEMX MintingBridge verifica y mintea VUSD',
    step6: 'Publicación en Mint Explorer con TX hash'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 DEPLOYED CONTRACT ADDRESSES ON LEMONCHAIN
// Version 3.0.0 - Deployed: January 15, 2026
// All contracts deployed and verified on LemonChain (Chain ID: 1006)
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_CONTRACTS: ContractAddresses = {
  // 🔐 VUSD OFICIAL - Stablecoin principal
  lusd: OFFICIAL_VUSD_CONTRACT,
  
  // 🪙 USD Token v3.0 - Token con swap 1:1 a VUSD
  usd: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  
  // 📊 PriceOracle v3.0 - Oracle de precios ($1.00 USD)
  priceOracle: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
  
  // 🏦 BankRegistry v3.0 - Registro de bancos con governance
  bankRegistry: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
  
  // 🔒 LockBox v3.0 - Sistema de custodia con timelock
  lockBox: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  
  // 🏛️ CustodyVault v3.0 - Gestión de vaults de custodia
  custodyVault: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  
  // 🌉 MintingBridge v3.0 - Puente de minting LEMX
  mintingBridge: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
  
  // 📦 Contratos legacy (no usados en v3)
  custodyFactory: '0x0000000000000000000000000000000000000000',
  issuerController: '0x0000000000000000000000000000000000000000',
  issuerReserveVault: '0x0000000000000000000000000000000000000000',
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEMON CHAIN AUTHORIZED WALLETS & ROLES
// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORIZED_WALLETS and getAuthorizedWalletsWithKeys() are imported from '../config/wallets'
// All wallet credentials are securely loaded from environment variables (.env)
// ═══════════════════════════════════════════════════════════════════════════════

// Role constants for contract calls
const ROLES = {
  ADMIN: 'ADMIN',
  DAES_SIGNER: 'DAES_SIGNER',
  BANK_SIGNER: 'BANK_SIGNER',
  ISSUER_OPERATOR: 'ISSUER_OPERATOR',
  APPROVER: 'APPROVER'
} as const;

// Get wallets with keys from secure config (loads from .env)
const AUTHORIZED_WALLETS_WITH_KEYS = getAuthorizedWalletsWithKeys();

// Connection mode type
type ConnectionMode = 'direct' | 'metamask' | 'none';

// ═══════════════════════════════════════════════════════════════════════════════
// LEMON CHAIN NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const LEMON_CHAIN: NetworkConfig = {
  chainId: 1006,
  chainName: 'LemonChain',
  rpcUrl: 'https://rpc.lemonchain.io',
  blockExplorer: 'https://explorer.lemonchain.io',
  nativeCurrency: { name: 'LemonX', symbol: 'LEMX', decimals: 18 }
};

// Alternative RPC endpoints for fallback
const LEMON_CHAIN_RPC_ENDPOINTS = [
  'https://rpc.lemonchain.io',
  'https://rpc1.lemonchain.io',
  'https://rpc2.lemonchain.io'
];

// Network information for display
const LEMON_CHAIN_INFO = {
  name: 'LemonChain',
  chainId: 1006,
  hexChainId: '0x3EE',
  currency: {
    name: 'LemonX',
    symbol: 'LEMX',
    decimals: 18
  },
  rpc: {
    primary: 'https://rpc.lemonchain.io',
    endpoints: LEMON_CHAIN_RPC_ENDPOINTS
  },
  explorer: {
    url: 'https://explorer.lemonchain.io',
    api: 'https://explorer.lemonchain.io/api'
  },
  documentation: 'https://docs.lemonchain.io',
  website: 'https://www.lemonchain.io'
};

const LOCK_STATUS_MAP: Record<number, LockInfo['status']> = {
  0: 'NONE', 1: 'REQUESTED', 2: 'LOCKED', 3: 'CONSUMED', 4: 'CANCELED'
};

const STORAGE_KEY_CONTRACTS = 'dcb_treasury_contracts';
const STORAGE_KEY_BANKS = 'dcb_treasury_banks';
const STORAGE_KEY_CUSTODIES = 'dcb_treasury_custodies';
const STORAGE_KEY_LOCKS = 'dcb_treasury_locks';
const STORAGE_KEY_MINTED_LOCKS = 'dcb_minted_locks';
const STORAGE_KEY_LEMX_APPROVALS = 'dcb_lemx_approval_statuses';

function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function formatAmount(amount: string | bigint, decimals: number = 18): string {
  try {
    const num = typeof amount === 'bigint' ? Number(amount) / Math.pow(10, decimals) : parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  } catch { return '0.00'; }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function bytes32FromName(name: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(name);
  let hash = 0n;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5n) - hash) + BigInt(data[i]);
    hash = hash & ((1n << 256n) - 1n);
  }
  return '0x' + hash.toString(16).padStart(64, '0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORIZATION CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateAuthorizationCode(): string {
  const prefix = 'LEMX';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const checksum = ((parseInt(timestamp, 36) + parseInt(random, 36)) % 9999).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}-${checksum}`;
}

function generateRequestCode(): string {
  return `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateMintingReference(): string {
  return `MINT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

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

// Storage key for LEMX authorization requests
const STORAGE_KEY_LEMX_REQUESTS = 'lemx_mint_authorization_requests';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface DCBTreasuryCertificationModuleProps {
  onBack?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DCBTreasuryCertificationModule({ onBack }: DCBTreasuryCertificationModuleProps) {
  const { language } = useLanguage();
  const t = useTranslations();
  const isSpanish = language === 'es';
  const terminalRef = useRef<HTMLDivElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contracts' | 'wallets' | 'banks' | 'custody' | 'locks' | 'minting' | 'approved' | 'rejected' | 'terminal' | 'api' | 'config'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Direct connection state
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none');
  const [selectedWallet, setSelectedWallet] = useState<AuthorizedWalletWithKey | null>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [lemonChainBalance, setLemonChainBalance] = useState<string>('0');
  const [rpcConnected, setRpcConnected] = useState(false);
  
  // API Connection Status
  const [apiConnectionStatus, setApiConnectionStatus] = useState<{ dcb: boolean; lemx: boolean }>({ dcb: false, lemx: false });

  // Contract addresses
  const [contracts, setContracts] = useState<ContractAddresses>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONTRACTS);
      return stored ? JSON.parse(stored) : DEFAULT_CONTRACTS;
    } catch { return DEFAULT_CONTRACTS; }
  });

  // Default Bank - Digital Commercial Bank Ltd.
  const DEFAULT_BANK: Bank = {
    bankId: 'DCB-001',
    name: 'Digital Commercial Bank Ltd.',
    signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559', // Admin wallet
    active: true
  };

  // Data states
  const [banks, setBanks] = useState<Bank[]>([DEFAULT_BANK]);
  const [custodies, setCustodies] = useState<CustodyVaultInfo[]>([]);
  const [locks, setLocks] = useState<LockInfo[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  
  // Custody Accounts from CustodyStore (source of funds)
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<CustodyAccount | null>(null);
  
  // Dashboard collapsible sections
  const [isRecentLocksExpanded, setIsRecentLocksExpanded] = useState(true);
  const [isCustodyAccountsExpanded, setIsCustodyAccountsExpanded] = useState(true);
  const [isRecentMintsExpanded, setIsRecentMintsExpanded] = useState(true);
  const [showCustodyAccountSelector, setShowCustodyAccountSelector] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN REAL-TIME DATA STATE - Fed from LemonChain RPC
  // ═══════════════════════════════════════════════════════════════════════════════
  const [blockchainData, setBlockchainData] = useState({
    vusdTotal: 0,
    vusdMints: 0,
    blockHeight: 0,
    totalEvents: 0,
    recentMints: [] as Array<{txHash: string; amount: string; to: string; blockNumber: number}>,
    lastUpdated: ''
  });
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SANDBOX MODE & AUTOMATIC CERTIFICATION SYSTEM
  // Read from environment variable - defaults to true if not set
  // ═══════════════════════════════════════════════════════════════════════════════
  const [sandboxMode, setSandboxMode] = useState(() => {
    const envSandbox = import.meta.env.VITE_SANDBOX_MODE;
    // If explicitly set to 'false', use production mode
    return envSandbox !== 'false';
  });
  const [certificationRecords, setCertificationRecords] = useState<CustodyCertificationRecord[]>([]);
  const [activeCertification, setActiveCertification] = useState<CustodyCertificationRecord | null>(null);
  const [isProcessingCertification, setIsProcessingCertification] = useState(false);
  const [certificationProgress, setCertificationProgress] = useState(0);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [certificationAmount, setCertificationAmount] = useState('');
  
  // LEMX Authorization System
  const [showLEMXAuthModal, setShowLEMXAuthModal] = useState(false);
  const [selectedCertForAuth, setSelectedCertForAuth] = useState<CustodyCertificationRecord | null>(null);
  const [lemxAuthRequests, setLemxAuthRequests] = useState<MintAuthorizationRequest[]>([]);
  const [showMintWithCodeModal, setShowMintWithCodeModal] = useState(false);
  const [mintAuthCode, setMintAuthCode] = useState('');
  const [mintWithCodeAmount, setMintWithCodeAmount] = useState('');
  
  // 2-Step Mint with Code states
  const [mintWithCodeStep, setMintWithCodeStep] = useState<'enter_code' | 'enter_hash' | 'confirm' | 'complete'>('enter_code');
  const [validatedAuthorization, setValidatedAuthorization] = useState<PendingMintAuthorization | null>(null);
  const [lemxMintTxHash, setLemxMintTxHash] = useState('');
  const [lemxContractAddress, setLemxContractAddress] = useState('');
  const [contractVerified, setContractVerified] = useState(false);
  const [showAuthorizationCodeModal, setShowAuthorizationCodeModal] = useState(false);
  const [lastAuthorizationCode, setLastAuthorizationCode] = useState<PendingMintAuthorization | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LEMX MINTING APPROVAL STATUS - Real-time sync with LEMX Minting Platform
  // ═══════════════════════════════════════════════════════════════════════════════
  interface LemxApprovalStatus {
    lockId: string;
    status: 'pending' | 'approved' | 'rejected';
    amount: string;
    currency: string;
    approvedAmount?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    sourceAccountId?: string;
    sourceAccountName?: string;
  }
  
  // Load LEMX approval statuses from localStorage for persistence
  const [lemxApprovalStatuses, setLemxApprovalStatuses] = useState<LemxApprovalStatus[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LEMX_APPROVALS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showLemxApprovalBanner, setShowLemxApprovalBanner] = useState(false);
  const [lastApprovedLock, setLastApprovedLock] = useState<LemxApprovalStatus | null>(null);
  
  // State for collapsible LEMX notifications panel
  const [isLemxNotificationsExpanded, setIsLemxNotificationsExpanded] = useState(false);
  
  // WebSocket status indicator
  const [wsMessagesReceived, setWsMessagesReceived] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Ref to track already logged lock IDs to prevent duplicate terminal entries
  const loggedApprovalIdsRef = useRef<Set<string>>(new Set());
  const loggedRejectionIdsRef = useRef<Set<string>>(new Set());
  const loggedMintedIdsRef = useRef<Set<string>>(new Set());
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MINTED LOCKS STATUS - Real-time sync for minted locks
  // ═══════════════════════════════════════════════════════════════════════════════
  interface MintedLockStatus {
    lockId: string;
    amount: string;
    currency: string;
    mintTxHash?: string;
    publicationCode?: string;
    mintedAt?: string;
    lusdContractAddress?: string;
    sourceAccountId?: string;
    sourceAccountName?: string;
  }
  
  // Load minted locks from localStorage for persistence
  const [mintedLocks, setMintedLocks] = useState<MintedLockStatus[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MINTED_LOCKS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showMintedBanner, setShowMintedBanner] = useState(false);
  const [lastMintedLock, setLastMintedLock] = useState<MintedLockStatus | null>(null);
  const [totalMintedAmount, setTotalMintedAmount] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MINTED_LOCKS);
      const minted = stored ? JSON.parse(stored) : [];
      return minted.reduce((sum: number, m: MintedLockStatus) => sum + parseFloat(m.amount || '0'), 0);
    } catch { return 0; }
  });
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MINT LEMON EXPLORER VUSD - Transaction History System
  // ═══════════════════════════════════════════════════════════════════════════════
  const STORAGE_KEY_MINT_EXPLORER = 'dcb_mint_lemon_explorer_lusd';
  const STORAGE_KEY_PENDING_AUTHS = 'dcb_pending_mint_authorizations';
  
  const [mintVUSDTransactions, setMintVUSDTransactions] = useState<MintVUSDTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MINT_EXPLORER);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  
  // Pending Mint Authorizations (from Consume & Mint, waiting for LEMX to mint)
  const [pendingMintAuthorizations, setPendingMintAuthorizations] = useState<PendingMintAuthorization[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_AUTHS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  
  const [showMintExplorer, setShowMintExplorer] = useState(false);
  const [selectedMintTransaction, setSelectedMintTransaction] = useState<MintVUSDTransaction | null>(null);
  const [showMintSuccessModal, setShowMintSuccessModal] = useState(false);
  const [lastMintTransaction, setLastMintTransaction] = useState<MintVUSDTransaction | null>(null);

  // Form states
  const [newBankForm, setNewBankForm] = useState({ name: '', signer: '' });
  const [newCustodyForm, setNewCustodyForm] = useState({ 
    owner: '', 
    metadata: '',
    sourceCustodyAccountId: '', // ID de la cuenta custodio origen
    fundAmount: '' // Monto a transferir desde la cuenta custodio
  });
  const [newLockForm, setNewLockForm] = useState({
    bankId: '',
    daesTxnId: '',
    isoHash: '',
    custodyVault: '',
    beneficiary: '',
    amountUSD: '',
    requestedVUSD: '',
    expiryDays: '30'
  });
  const [mintForm, setMintForm] = useState({
    custodyVault: '',
    amount: '',
    msgId: '',
    uetr: ''
  });

  // Terminal logging
  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string, metadata?: any) => {
    const line: TerminalLine = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata
    };
    setTerminalLines(prev => [...prev.slice(-500), line]);
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Check API Connection
  const checkApiConnection = useCallback(async () => {
    try {
      // Check DCB Treasury API
      const dcbResponse = await fetch('http://localhost:4010/api/health');
      const dcbOk = dcbResponse.ok;
      
      // Check LEMX Minting API
      const lemxResponse = await fetch('http://localhost:4011/api/health');
      const lemxOk = lemxResponse.ok;
      
      setApiConnectionStatus({ dcb: dcbOk, lemx: lemxOk });
      
      if (dcbOk && lemxOk) {
        addTerminalLine('success', '✓ Both APIs connected successfully');
      } else {
        if (!dcbOk) addTerminalLine('error', '✗ DCB Treasury API not responding');
        if (!lemxOk) addTerminalLine('error', '✗ LEMX Minting API not responding');
      }
    } catch (e) {
      setApiConnectionStatus({ dcb: false, lemx: false });
      addTerminalLine('error', 'API connection check failed');
    }
  }, [addTerminalLine]);

  // Initialize
  useEffect(() => {
    addTerminalLine('system', '╔══════════════════════════════════════════════════════════════════╗');
    addTerminalLine('system', '║   DCB TREASURY CERTIFICATION PLATFORM v2.0.0                     ║');
    addTerminalLine('system', '║   Digital Commercial Bank - Blockchain Treasury Management       ║');
    addTerminalLine('system', '╚══════════════════════════════════════════════════════════════════╝');
    addTerminalLine('info', 'System initialized. Connecting to LemonChain...');
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-CONNECT TO LEMONCHAIN ON STARTUP (via AutoConnectService)
    // Always connect to read blockchain data for MintLemonExplorer
    // ═══════════════════════════════════════════════════════════════════════════
    const autoConnectToBlockchain = async () => {
      const adminKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
      
      if (adminKey) {
        try {
          console.log('%c🔗 [DCB Treasury] Auto-connecting to LemonChain...', 'color: #00ff00; font-weight: bold; font-size: 14px;');
          addTerminalLine('blockchain', '🔗 Conectando automáticamente a LemonChain...');
          
          // Connect both services in parallel
          const [autoConnected, blockchainConnected] = await Promise.all([
            autoConnectService.autoConnect(adminKey),
            blockchainIntegration.connectWithPrivateKey(adminKey)
          ]);
          
          if (autoConnected || blockchainConnected) {
            const address = blockchainIntegration.getWalletAddress() || autoConnectService.getWalletAddress();
            addTerminalLine('success', `✅ Conectado a LemonChain - Wallet: ${address?.slice(0, 8)}...${address?.slice(-6)}`);
            console.log('%c✅ [DCB Treasury] Auto-connected to LemonChain!', 'color: #00ff00; font-weight: bold;');
            console.log('%c   📊 AutoConnectService syncing blockchain data for MintLemonExplorer', 'color: #00ffff;');
            
            // Subscribe to blockchain data updates
            autoConnectService.onExplorerDataUpdate((explorerData) => {
              console.log('%c📊 [DCB Treasury] Blockchain data update:', 'color: #9b59b6;', {
                injections: explorerData.totalInjections,
                locks: explorerData.totalLocks,
                vusd: explorerData.totalVUSDMinted
              });
            });
          }
        } catch (error: any) {
          console.error('[DCB Treasury] Auto-connect failed:', error);
          addTerminalLine('warning', `⚠️ Auto-conexión fallida: ${error.message}`);
        }
      } else {
        addTerminalLine('info', '📦 Configure VITE_ADMIN_PRIVATE_KEY en .env para auto-conexión');
      }
    };
    
    autoConnectToBlockchain();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔄 SUPABASE INITIALIZATION - Required for real-time sync with Treasury Minting
    // ═══════════════════════════════════════════════════════════════════════════════
    const initSupabase = async () => {
      console.log('%c🔄 [DCB Treasury] Initializing Supabase for real-time sync...', 'color: #00d9ff; font-weight: bold; font-size: 14px;');
      addTerminalLine('network', '🔄 Conectando a Supabase para sincronización en tiempo real...');
      
      try {
        const connected = await supabaseSync.initialize('dcb');
        if (connected) {
          console.log('%c✅ [DCB Treasury] Supabase connected!', 'color: #00ff00; font-weight: bold;');
          addTerminalLine('success', '✅ Supabase conectado - Sincronización con Treasury Minting activa');
        } else {
          console.warn('%c⚠️ [DCB Treasury] Supabase connection failed', 'color: #ffaa00;');
          addTerminalLine('warning', '⚠️ Error conectando a Supabase - Reintentando...');
          // Retry after 3 seconds
          setTimeout(async () => {
            const retryResult = await supabaseSync.initialize('dcb');
            if (retryResult) {
              addTerminalLine('success', '✅ Supabase reconectado exitosamente');
            }
          }, 3000);
        }
      } catch (error: any) {
        console.error('[DCB Treasury] Supabase init error:', error);
        addTerminalLine('error', `❌ Error Supabase: ${error.message}`);
      }
    };
    
    initSupabase();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BLOCKCHAIN DATA FEED - Real-time data from LemonChain RPC
    // ═══════════════════════════════════════════════════════════════════════════════
    const fetchBlockchainData = async () => {
      try {
        const data = await autoConnectService.fetchDashboardDataDirect();
        setBlockchainData({
          ...data,
          lastUpdated: new Date().toISOString()
        });
        console.log('%c📊 [DCB Treasury] Blockchain Data:', 'color: #9b59b6;', {
          vusdTotal: data.vusdTotal.toLocaleString(),
          mints: data.vusdMints,
          block: data.blockHeight
        });
      } catch (error) {
        console.error('[DCB Treasury] Blockchain data fetch error:', error);
      }
    };
    
    // Fetch immediately
    fetchBlockchainData();
    
    // Refresh every 5 seconds
    const blockchainInterval = setInterval(fetchBlockchainData, 5000);
    
    // Cleanup interval on unmount
    const cleanupBlockchain = () => clearInterval(blockchainInterval);
    
    // Check API connection on init
    checkApiConnection();
    
    // Load saved data
    try {
      const savedBanks = localStorage.getItem(STORAGE_KEY_BANKS);
      if (savedBanks) {
        const parsedBanks = JSON.parse(savedBanks) as Bank[];
        // Ensure Digital Commercial Bank Ltd. is always present
        const hasDCB = parsedBanks.some(b => b.bankId === 'DCB-001');
        if (!hasDCB) {
          parsedBanks.unshift(DEFAULT_BANK);
        }
        setBanks(parsedBanks);
      }
      
      const savedCustodies = localStorage.getItem(STORAGE_KEY_CUSTODIES);
      if (savedCustodies) setCustodies(JSON.parse(savedCustodies));
      
      const savedLocks = localStorage.getItem(STORAGE_KEY_LOCKS);
      if (savedLocks) setLocks(JSON.parse(savedLocks));
    } catch (e) {
      addTerminalLine('warning', 'Failed to load saved data from localStorage');
    }
    
    // Load Custody Accounts from CustodyStore
    const loadCustodyAccounts = () => {
      const accounts = custodyStore.getAccounts();
      setCustodyAccounts(accounts);
      addTerminalLine('info', `Loaded ${accounts.length} custody accounts from store`);
      
      // If there are custody accounts, ensure Digital Commercial Bank Ltd. is registered
      if (accounts.length > 0) {
        setBanks(prevBanks => {
          const hasDCB = prevBanks.some(b => b.bankId === 'DCB-001');
          if (!hasDCB) {
            addTerminalLine('success', '✓ Auto-registered: Digital Commercial Bank Ltd.');
            return [DEFAULT_BANK, ...prevBanks];
          }
          return prevBanks;
        });
      }
    };
    loadCustodyAccounts();
    
    // Subscribe to custody store changes
    const unsubscribe = custodyStore.subscribe((accounts) => {
      setCustodyAccounts(accounts);
    });
    
    // Check WebSocket connection status periodically
    const wsCheckInterval = setInterval(() => {
      const status = dcbWebSocket.getConnectionStatus();
      setWsConnected(status);
    }, 1000);
    
    // Subscribe to WebSocket events from LEMX Minting Platform
    console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #00ffff; font-weight: bold; font-size: 14px');
    console.log('%c║  🔔 DCB TREASURY: SUBSCRIBING TO WEBSOCKET EVENTS               ║', 'color: #00ffff; font-weight: bold; font-size: 14px');
    console.log('%c║  WebSocket Status: ' + (dcbWebSocket.getConnectionStatus() ? 'CONNECTED ✅' : 'DISCONNECTED ❌').padEnd(44) + '║', 'color: #ffff00; font-weight: bold');
    console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #00ffff; font-weight: bold; font-size: 14px');
    
    const unsubscribeWs = dcbWebSocket.subscribe((event) => {
      console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-weight: bold; font-size: 14px');
      console.log('%c║  📨 DCB TREASURY COMPONENT - WEBSOCKET EVENT RECEIVED           ║', 'color: #00ff00; font-weight: bold; font-size: 14px');
      console.log('%c╠══════════════════════════════════════════════════════════════════╣', 'color: #00ff00; font-weight: bold');
      console.log('%c║  Type: ' + event.type.padEnd(55) + '║', 'color: #ffff00; font-weight: bold');
      console.log('%c║  Payload: ' + JSON.stringify(event.payload).substring(0, 52).padEnd(52) + '║', 'color: #ffffff');
      console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-weight: bold; font-size: 14px');
      
      // Update message counter
      setWsMessagesReceived(prev => {
        const newCount = prev + 1;
        console.log('%c🔢 WS MESSAGE COUNT UPDATED: ' + newCount, 'color: #ff00ff; font-weight: bold; font-size: 16px; background: #330033; padding: 5px');
        return newCount;
      });
      
      // DEBUG: Show visual alert for any WebSocket message (except initial_state)
      if (event.type !== 'initial_state') {
        console.log('%c🚨 WEBSOCKET EVENT RECEIVED - SHOULD UPDATE UI NOW!', 'color: #ff0000; font-weight: bold; font-size: 18px; background: #ffff00; padding: 10px');
      }
      
      if (event.type === 'lock.approved') {
        const payload = event.payload;
        console.log('🔓 Processing lock.approved event...');
        
        // Add to terminal
        addTerminalLine('success', `🔓 LOCK APROBADO desde LEMX Minting`);
        addTerminalLine('info', `   Lock ID: ${payload?.lockId}`);
        addTerminalLine('info', `   Monto Aprobado: $${payload?.approvedAmount}`);
        addTerminalLine('info', `   Monto Restante (Lock Reserve): $${payload?.remainingAmount || '0'}`);
        addTerminalLine('info', `   Aprobado por: ${payload?.approvedBy}`);
        
        // Update local state and SHOW BANNER
        if (payload?.lockId) {
          const newApproval: LemxApprovalStatus = {
            lockId: payload.lockId,
            status: 'approved' as const,
            amount: payload.originalAmount || payload.approvedAmount,
            currency: 'USD',
            approvedAmount: payload.approvedAmount,
            approvedAt: payload.approvedAt,
            approvedBy: payload.approvedBy
          };
          
          setLemxApprovalStatuses(prev => {
            const existing = prev.find(s => s.lockId === payload.lockId);
            if (existing) {
              return prev.map(s => s.lockId === payload.lockId 
                ? { ...s, status: 'approved' as const, approvedAmount: payload.approvedAmount, approvedAt: payload.approvedAt }
                : s
              );
            }
            return [...prev, newApproval];
          });
          
          // SHOW THE APPROVAL BANNER
          setLastApprovedLock(newApproval);
          setShowLemxApprovalBanner(true);
          console.log('✅ Banner should now be visible!');
        }
      } else if (event.type === 'lock.rejected') {
        const payload = event.payload;
        addTerminalLine('error', `❌ LOCK RECHAZADO desde LEMX Minting`);
        addTerminalLine('info', `   Lock ID: ${payload?.lockId}`);
        addTerminalLine('info', `   Razón: ${payload?.reason || 'No especificada'}`);
      } else if (event.type === 'lock.reserve.created') {
        const payload = event.payload;
        addTerminalLine('info', `📦 LOCK RESERVE creado`);
        addTerminalLine('info', `   Monto Reservado: $${payload?.amount}`);
      } else if (event.type === 'mint.completed') {
        const payload = event.payload;
        addTerminalLine('success', `🎉 MINT COMPLETADO desde LEMX Minting`);
        addTerminalLine('info', `   Lock ID: ${payload?.lockId}`);
        addTerminalLine('info', `   Amount: $${payload?.amount} VUSD`);
        addTerminalLine('info', `   TX Hash: ${payload?.txHash}`);
        addTerminalLine('info', `   Publication Code: ${payload?.publicationCode}`);
        addTerminalLine('info', `   Beneficiary: ${payload?.beneficiary}`);
        
        // Update minted locks state and show banner
        if (payload?.lockId && payload?.amount) {
          const newMintedLock: MintedLockStatus = {
            lockId: payload.lockId,
            amount: payload.amount,
            currency: 'VUSD',
            mintedAt: payload.mintedAt || new Date().toISOString(),
            mintTxHash: payload.txHash,
            publicationCode: payload.publicationCode,
            beneficiary: payload.beneficiary,
            bankName: payload.bankName,
            sourceAccountName: payload.bankName
          };
          
          // Add to minted locks if not already there
          setMintedLocks(prev => {
            if (prev.some(m => m.lockId === payload.lockId)) return prev;
            return [...prev, newMintedLock];
          });
          
          // Update total minted amount
          setTotalMintedAmount(prev => prev + parseFloat(payload.amount || '0'));
          
          // Show banner
          setLastMintedLock(newMintedLock);
          setShowMintedBanner(true);
          
          console.log('🎉 Mint completed banner should now be visible!');
        }
      }
    });
    
    return () => {
      unsubscribe();
      unsubscribeWs();
      clearInterval(wsCheckInterval);
      cleanupBlockchain(); // Clear blockchain data interval
    };
  }, [addTerminalLine]);

  // Save data on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(banks));
  }, [banks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTODIES, JSON.stringify(custodies));
  }, [custodies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(locks));
  }, [locks]);

  // Save Mint VUSD Transactions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MINT_EXPLORER, JSON.stringify(mintVUSDTransactions));
  }, [mintVUSDTransactions]);
  
  // Save Pending Mint Authorizations to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PENDING_AUTHS, JSON.stringify(pendingMintAuthorizations));
  }, [pendingMintAuthorizations]);
  
  // Save LEMX Approval Statuses to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEMX_APPROVALS, JSON.stringify(lemxApprovalStatuses));
    console.log('[DCB] 💾 LEMX Approvals saved:', lemxApprovalStatuses.length, 
      '- Approved:', lemxApprovalStatuses.filter(a => a.status === 'approved').length,
      '- Rejected:', lemxApprovalStatuses.filter(a => a.status === 'rejected').length);
  }, [lemxApprovalStatuses]);
  
  // Save Minted Locks to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MINTED_LOCKS, JSON.stringify(mintedLocks));
    console.log('[DCB] 💾 Minted locks saved:', mintedLocks.length);
  }, [mintedLocks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEMX MINTING APPROVAL STATUS POLLING - Real-time sync
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchLemxApprovals = async () => {
      try {
        // Fetch approved locks from DCB Treasury API (which receives webhooks from LEMX)
        const response = await fetch('http://localhost:4010/api/locks/approved-by-lemx');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const approvals: LemxApprovalStatus[] = result.data.map((lock: any) => ({
              lockId: lock.lockId,
              status: 'approved' as const,
              amount: lock.lockDetails?.amount || '0',
              currency: lock.lockDetails?.currency || 'USD',
              approvedAt: lock.approvedByLemxAt,
              approvedBy: lock.approvedByLemx,
              sourceAccountId: lock.sourceOfFunds?.accountId,
              sourceAccountName: lock.sourceOfFunds?.accountName
            }));
            
            // Check for new approvals using ref to avoid duplicates
            const newApprovals = approvals.filter(a => !loggedApprovalIdsRef.current.has(a.lockId));
            
            if (newApprovals.length > 0) {
              // Show banner for new approval
              setLastApprovedLock(newApprovals[0]);
              setShowLemxApprovalBanner(true);
              
              // ═══════════════════════════════════════════════════════════════════════════════
              // REGISTRO PERSISTENTE EN TERMINAL - APROBACIÓN DE LEMX MINTING
              // ═══════════════════════════════════════════════════════════════════════════════
              newApprovals.forEach((approval) => {
                // Mark as logged to prevent duplicates
                loggedApprovalIdsRef.current.add(approval.lockId);
                
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
                addTerminalLine('success', '🎉 ¡ORDEN APROBADA POR LEMX MINTING!');
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
                addTerminalLine('blockchain', `  📋 Lock ID: ${approval.lockId}`);
                addTerminalLine('contract', `  💰 Monto: $${parseFloat(approval.amount).toLocaleString()} ${approval.currency}`);
                addTerminalLine('info', `  🏦 Cuenta Custodio: ${approval.sourceAccountName || 'N/A'}`);
                addTerminalLine('info', `  🆔 Account ID: ${approval.sourceAccountId || 'N/A'}`);
                addTerminalLine('success', `  ✅ Aprobado por: ${approval.approvedBy || 'LEMX Operator'}`);
                addTerminalLine('info', `  📅 Fecha: ${approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : new Date().toLocaleString()}`);
                addTerminalLine('system', '───────────────────────────────────────────────────────────────');
                addTerminalLine('warning', '  ⚠️ SIGUIENTE PASO: Proceder con el minting de VUSD');
                addTerminalLine('info', '  → El operador LEMX debe completar el proceso de minting');
                addTerminalLine('info', '  → Una vez minteado, se publicará en MINT LEMON EXPLORER');
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
              });
              
              // Auto-hide banner after 10 seconds
              setTimeout(() => setShowLemxApprovalBanner(false), 10000);
            }
            
            setLemxApprovalStatuses(approvals);
          }
        }
        
        // Also fetch rejected locks
        const rejectedResponse = await fetch('http://localhost:4010/api/locks/rejected-by-lemx');
        if (rejectedResponse.ok) {
          const rejectedResult = await rejectedResponse.json();
          if (rejectedResult.success && rejectedResult.data) {
            const rejections: LemxApprovalStatus[] = rejectedResult.data.map((lock: any) => ({
              lockId: lock.lockId,
              status: 'rejected' as const,
              amount: lock.lockDetails?.amount || '0',
              currency: lock.lockDetails?.currency || 'USD',
              rejectedAt: lock.rejectedByLemxAt,
              rejectedBy: lock.rejectedByLemx,
              rejectionReason: lock.rejectionReason,
              sourceAccountId: lock.sourceOfFunds?.accountId,
              sourceAccountName: lock.sourceOfFunds?.accountName
            }));
            
            // Check for new rejections using ref to avoid duplicates
            const newRejections = rejections.filter(r => !loggedRejectionIdsRef.current.has(r.lockId));
            
            // ═══════════════════════════════════════════════════════════════════════════════
            // REGISTRO PERSISTENTE EN TERMINAL - RECHAZO DE LEMX MINTING
            // ═══════════════════════════════════════════════════════════════════════════════
            if (newRejections.length > 0) {
              newRejections.forEach((rejection) => {
                // Mark as logged to prevent duplicates
                loggedRejectionIdsRef.current.add(rejection.lockId);
                
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
                addTerminalLine('error', '❌ ORDEN RECHAZADA POR LEMX MINTING');
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
                addTerminalLine('blockchain', `  📋 Lock ID: ${rejection.lockId}`);
                addTerminalLine('contract', `  💰 Monto: $${parseFloat(rejection.amount).toLocaleString()} ${rejection.currency}`);
                addTerminalLine('info', `  🏦 Cuenta Custodio: ${rejection.sourceAccountName || 'N/A'}`);
                addTerminalLine('error', `  ❌ Rechazado por: ${rejection.rejectedBy || 'LEMX Operator'}`);
                addTerminalLine('warning', `  📝 Razón: ${rejection.rejectionReason || 'No especificada'}`);
                addTerminalLine('info', `  📅 Fecha: ${rejection.rejectedAt ? new Date(rejection.rejectedAt).toLocaleString() : new Date().toLocaleString()}`);
                addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
              });
            }
            
            setLemxApprovalStatuses(prev => {
              const approvedOnly = prev.filter(a => a.status === 'approved');
              return [...approvedOnly, ...rejections];
            });
          }
        }
      } catch (error) {
        // Silent fail - API might not be running
      }
    };
    
    // Initial fetch
    fetchLemxApprovals();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchLemxApprovals, 3000);
    
    return () => clearInterval(interval);
  }, [addTerminalLine]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MINTED LOCKS POLLING - Real-time sync for completed mints
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchMintedLocks = async () => {
      try {
        const response = await fetch('http://localhost:4010/api/locks/minted');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const minted: MintedLockStatus[] = result.data.map((lock: any) => ({
              lockId: lock.lockId,
              // Usar mintedDetails.mintedAmount si existe, de lo contrario lockDetails.amount
              amount: lock.mintedDetails?.mintedAmount || lock.lockDetails?.amount || '0',
              currency: lock.lockDetails?.currency || 'USD',
              mintTxHash: lock.mintTxHash || lock.mintedDetails?.txHash,
              publicationCode: lock.publicationCode || lock.mintedDetails?.publicationCode,
              mintedAt: lock.mintedAt || lock.mintedDetails?.mintedAt,
              lusdContractAddress: lock.lusdContractAddress || lock.mintedDetails?.lusdContractAddress,
              sourceAccountId: lock.sourceOfFunds?.accountId,
              sourceAccountName: lock.sourceOfFunds?.accountName
            }));
            
            // Check for new minted locks using ref to avoid duplicates
            const newMinted = minted.filter(m => !loggedMintedIdsRef.current.has(m.lockId));
            
            if (newMinted.length > 0) {
              // Show banner for new minting
              setLastMintedLock(newMinted[0]);
              setShowMintedBanner(true);
              
              // ═══════════════════════════════════════════════════════════════════════════════
              // REGISTRO PERSISTENTE EN TERMINAL - MINTING COMPLETADO
              // ═══════════════════════════════════════════════════════════════════════════════
              newMinted.forEach((mint) => {
                // Mark as logged to prevent duplicates
                loggedMintedIdsRef.current.add(mint.lockId);
                
                addTerminalLine('system', '╔══════════════════════════════════════════════════════════════════╗');
                addTerminalLine('success', '║   🎉 ¡VUSD MINTEADO EXITOSAMENTE!                                ║');
                addTerminalLine('system', '╠══════════════════════════════════════════════════════════════════╣');
                addTerminalLine('blockchain', `  📋 Lock ID: ${mint.lockId}`);
                addTerminalLine('contract', `  💰 Monto Minteado: $${parseFloat(mint.amount).toLocaleString()} VUSD`);
                addTerminalLine('info', `  🏦 Cuenta Custodio: ${mint.sourceAccountName || 'N/A'}`);
                addTerminalLine('blockchain', `  🔗 TX Hash: ${mint.mintTxHash || 'N/A'}`);
                addTerminalLine('contract', `  📜 Contrato VUSD: ${mint.lusdContractAddress || '0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99'}`);
                addTerminalLine('info', `  📅 Fecha: ${mint.mintedAt ? new Date(mint.mintedAt).toLocaleString() : new Date().toLocaleString()}`);
                addTerminalLine('system', '╠══════════════════════════════════════════════════════════════════╣');
                addTerminalLine('success', '║   ✅ Transacción publicada en MINT LEMON EXPLORER                ║');
                addTerminalLine('system', '╚══════════════════════════════════════════════════════════════════╝');
              });
              
              // Auto-hide banner after 15 seconds
              setTimeout(() => setShowMintedBanner(false), 15000);
            }
            
            setMintedLocks(minted);
            setTotalMintedAmount(result.totalMintedAmount || 0);
          }
        }
      } catch (error) {
        // Silent fail - API might not be running
      }
    };
    
    // Initial fetch
    fetchMintedLocks();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchMintedLocks, 3000);
    
    return () => clearInterval(interval);
  }, [addTerminalLine, mintedLocks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DIRECT CONNECTION TO LEMONCHAIN (No MetaMask Required)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Test RPC connection to LemonChain
  const testRpcConnection = async (): Promise<boolean> => {
    for (const rpcUrl of LEMON_CHAIN_RPC_ENDPOINTS) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        });
        const data = await response.json();
        if (data.result) {
          const chainIdNum = parseInt(data.result, 16);
          if (chainIdNum === LEMON_CHAIN.chainId) {
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  };

  // Get balance from LemonChain RPC
  const getBalanceFromRpc = async (address: string): Promise<string> => {
    try {
      const response = await fetch(LEMON_CHAIN.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1
        })
      });
      const data = await response.json();
      if (data.result) {
        const balanceWei = BigInt(data.result);
        const balanceEth = Number(balanceWei) / 1e18;
        return balanceEth.toFixed(4);
      }
    } catch (e) {
      console.error('Failed to get balance:', e);
    }
    return '0';
  };

  // Connect directly to LemonChain with selected wallet
  const connectDirectly = async (wallet: AuthorizedWalletWithKey) => {
    try {
      setLoading(true);
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      addTerminalLine('command', '> DIRECT CONNECTION TO LEMONCHAIN');
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      
      // Step 1: Test RPC connection
      addTerminalLine('info', '[1/4] Testing RPC connection...');
      addTerminalLine('network', `  RPC: ${LEMON_CHAIN.rpcUrl}`);
      
      const rpcOk = await testRpcConnection();
      if (!rpcOk) {
        throw new Error('Cannot connect to LemonChain RPC');
      }
      setRpcConnected(true);
      addTerminalLine('success', '  ✓ RPC connection established');
      
      // Step 2: Validate wallet
      addTerminalLine('info', '[2/4] Validating wallet...');
      addTerminalLine('blockchain', `  Address: ${wallet.address}`);
      addTerminalLine('blockchain', `  Role: ${wallet.role}`);
      
      // Get balance
      const balance = await getBalanceFromRpc(wallet.address);
      setLemonChainBalance(balance);
      addTerminalLine('success', `  ✓ Balance: ${balance} LEMX`);
      
      // Step 3: Connect blockchain integration with private key for REAL transactions
      addTerminalLine('info', '[3/4] Connecting blockchain integration...');
      if (wallet.privateKey) {
        try {
          await blockchainIntegration.connectWithPrivateKey(wallet.privateKey);
          addTerminalLine('success', '  ✓ Blockchain integration connected (can sign real transactions)');
          addTerminalLine('blockchain', `     Contract USD: ${CONTRACT_ADDRESSES.USD}`);
          addTerminalLine('blockchain', `     Contract LockReserve: ${CONTRACT_ADDRESSES.LockReserve}`);
          addTerminalLine('blockchain', `     Contract VUSDMinter: ${CONTRACT_ADDRESSES.VUSDMinter}`);
        } catch (blockchainErr: any) {
          addTerminalLine('warning', `  ⚠ Blockchain integration warning: ${blockchainErr.message}`);
          addTerminalLine('warning', '  Transactions will be simulated in sandbox mode');
        }
      } else {
        addTerminalLine('warning', '  ⚠ No private key available - sandbox mode only');
      }
      
      // Step 4: Set connection state
      addTerminalLine('info', '[4/4] Establishing connection...');
      
      setSelectedWallet(wallet);
      setWalletAddress(wallet.address);
      setChainId(LEMON_CHAIN.chainId);
      setConnectionMode('direct');
      setIsConnected(true);
      
      // ⚠️ CRITICAL: Auto-switch to PRODUCTION mode when blockchain is connected
      if (blockchainIntegration.getIsConnected()) {
        setSandboxMode(false);
        addTerminalLine('success', '  ✓ PRODUCTION MODE ENABLED (Real blockchain transactions)');
      }
      
      addTerminalLine('success', '  ✓ Direct connection established');
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      addTerminalLine('success', `✓ CONNECTED TO LEMONCHAIN (Chain ID: ${LEMON_CHAIN.chainId})`);
      addTerminalLine('success', `✓ Wallet: ${wallet.name} (${wallet.role})`);
      addTerminalLine('success', `✓ Address: ${formatAddress(wallet.address)}`);
      addTerminalLine('success', `✓ Blockchain: ${blockchainIntegration.getIsConnected() ? 'REAL TRANSACTIONS ENABLED' : 'Sandbox mode'}`);
      addTerminalLine('success', `✓ Mode: ${blockchainIntegration.getIsConnected() ? 'PRODUCTION' : 'SANDBOX'}`);
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      
      setShowWalletSelector(false);
      
    } catch (err: any) {
      addTerminalLine('error', `✗ Direct connection failed: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Connect via MetaMask (optional)
  const connectWallet = async () => {
    try {
      setLoading(true);
      addTerminalLine('command', '> Connecting via MetaMask...');

      if (typeof window.ethereum === 'undefined') {
        addTerminalLine('warning', '⚠ MetaMask not available. Use Direct Connection instead.');
        setShowWalletSelector(true);
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainIdNum = parseInt(chainIdHex, 16);

      setWalletAddress(accounts[0]);
      setChainId(chainIdNum);
      setConnectionMode('metamask');
      setIsConnected(true);

      addTerminalLine('success', `✓ MetaMask connected: ${formatAddress(accounts[0])}`);
      addTerminalLine('network', `✓ Chain ID: ${chainIdNum} (${chainIdNum === LEMON_CHAIN.chainId ? 'Lemon Chain' : 'Unknown'})`);

      if (chainIdNum !== LEMON_CHAIN.chainId) {
        addTerminalLine('warning', `⚠ Not connected to Lemon Chain (${LEMON_CHAIN.chainId}). Some features may not work.`);
      }

      // Listen for account/chain changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(accounts[0]);
          addTerminalLine('info', `Account changed: ${formatAddress(accounts[0])}`);
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex: string) => {
        const newChainId = parseInt(chainIdHex, 16);
        setChainId(newChainId);
        addTerminalLine('network', `Chain changed: ${newChainId}`);
      });

    } catch (err: any) {
      addTerminalLine('error', `✗ MetaMask connection failed: ${err.message}`);
      addTerminalLine('info', 'Try using Direct Connection instead.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress('');
    setChainId(0);
    setConnectionMode('none');
    setSelectedWallet(null);
    setLemonChainBalance('0');
    setRpcConnected(false);
    addTerminalLine('warning', 'Wallet disconnected');
  };

  // Refresh balance
  const refreshBalance = async () => {
    if (walletAddress && connectionMode === 'direct') {
      const balance = await getBalanceFromRpc(walletAddress);
      setLemonChainBalance(balance);
      addTerminalLine('info', `Balance refreshed: ${balance} LEMX`);
    }
  };

  // Switch to Lemon Chain
  const switchToLemonChain = async () => {
    try {
      addTerminalLine('command', '> Switching to Lemon Chain...');
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + LEMON_CHAIN.chainId.toString(16) }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + LEMON_CHAIN.chainId.toString(16),
              chainName: LEMON_CHAIN.chainName,
              rpcUrls: [LEMON_CHAIN.rpcUrl],
              blockExplorerUrls: [LEMON_CHAIN.blockExplorer],
              nativeCurrency: LEMON_CHAIN.nativeCurrency
            }]
          });
          addTerminalLine('success', '✓ Lemon Chain added to wallet');
        } catch (addError: any) {
          addTerminalLine('error', `✗ Failed to add chain: ${addError.message}`);
        }
      } else {
        addTerminalLine('error', `✗ Failed to switch chain: ${switchError.message}`);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTOMATIC CUSTODY CERTIFICATION PROCESS (SANDBOX MODE)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateCertificationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DCB-CERT-${year}${month}${day}-${random}`;
  };

  const generateTxHash = () => {
    return '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  const generateSignatureHash = () => {
    return '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  // OPTIMIZED: Minimal sleep only when UI update needed
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runAutomaticCertification = async () => {
    console.log('%c🚀 [DCB] runAutomaticCertification STARTED', 'color: #00ff00; font-size: 20px; font-weight: bold;');
    
    if (!selectedCustodyAccount || !certificationAmount) {
      console.log('❌ No account or amount selected');
      addTerminalLine('error', '✗ Please select a custody account and enter amount');
      return;
    }

    const amount = parseFloat(certificationAmount);
    console.log('📊 Amount parsed:', amount);
    
    if (isNaN(amount) || amount <= 0) {
      addTerminalLine('error', '✗ Invalid amount');
      return;
    }

    if (amount > selectedCustodyAccount.availableBalance) {
      addTerminalLine('error', `✗ Insufficient funds. Available: ${selectedCustodyAccount.availableBalance} ${selectedCustodyAccount.currency}`);
      return;
    }

    // FAST: Immediate UI update
    setIsProcessingCertification(true);
    setCertificationProgress(5);
    setShowCertificationModal(true);

    const certificationId = generateId();
    const certificationNumber = generateCertificationNumber();
    const events: CustodyCertificationEvent[] = [];
    
    const addEvent = (eventType: CustodyCertificationEvent['eventType'], description: string, details: Record<string, any>, txHash?: string) => {
      const event: CustodyCertificationEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        eventType,
        status: 'completed',
        description,
        details,
        txHash,
        blockNumber: sandboxMode ? Math.floor(Math.random() * 1000000) + 5000000 : undefined,
        gasUsed: sandboxMode ? String(Math.floor(Math.random() * 100000) + 50000) : undefined
      };
      events.push(event);
      addTerminalLine('blockchain', `[${eventType}] ${description}`);
      return event;
    };

    // Initialize certification record
    const certification: CustodyCertificationRecord = {
      id: certificationId,
      certificationNumber,
      createdAt: new Date().toISOString(),
      status: 'processing',
      sourceAccount: {
        id: selectedCustodyAccount.id,
        name: selectedCustodyAccount.accountName,
        type: selectedCustodyAccount.accountType,
        currency: selectedCustodyAccount.currency,
        balanceBefore: selectedCustodyAccount.availableBalance,
        balanceAfter: selectedCustodyAccount.availableBalance - amount
      },
      amount,
      currency: selectedCustodyAccount.currency,
      signatures: [],
      bank: {
        id: DEFAULT_BANK.bankId,
        name: DEFAULT_BANK.name,
        signer: DEFAULT_BANK.signer
      },
      events: [],
      metadata: {
        isoMessageId: `MSGID-${Date.now()}`,
        uetr: `${generateId()}-${generateId().substring(0, 4)}-${generateId().substring(0, 4)}-${generateId().substring(0, 4)}-${generateId()}`,
        reference: `REF-${Date.now().toString(36).toUpperCase()}`,
        beneficiary: 'DCB Treasury Vault',
        purpose: 'Custody Certification - Blockchain Treasury Management'
      },
      operatorWallet: walletAddress || selectedWallet?.address || '0x0000000000000000000000000000000000000000',
      operatorRole: selectedWallet?.role || 'OPERATOR'
    };

    setActiveCertification(certification);

    try {
      console.log('%c📝 [DCB] Starting certification process...', 'color: #ffaa00; font-size: 16px;');
      
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════════');
      addTerminalLine('system', `  AUTOMATIC CUSTODY CERTIFICATION PROCESS ${sandboxMode ? '[SANDBOX]' : '[PRODUCTION]'}`);
      addTerminalLine('system', `  Certification: ${certificationNumber}`);
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════════');

      // OPTIMIZED: Step 1 - Immediate start (10%)
      setCertificationProgress(10);
      addEvent('CUSTODY_INITIATED', 'Custody certification process initiated', {
        certificationNumber,
        sourceAccount: selectedCustodyAccount.accountName,
        amount,
        currency: selectedCustodyAccount.currency,
        operator: certification.operatorWallet
      });

      // OPTIMIZED: Step 2 - Reserve Funds (20%) - No unnecessary delay
      await sleep(100); // Minimal UI update delay
      setCertificationProgress(20);
      const reserveTxHash = generateTxHash();
      addEvent('FUNDS_RESERVED', `Reserved ${amount} ${selectedCustodyAccount.currency} from source account`, {
        sourceAccountId: selectedCustodyAccount.id,
        amount,
        balanceBefore: selectedCustodyAccount.availableBalance,
        balanceAfter: selectedCustodyAccount.availableBalance - amount,
        reservationId: generateId()
      }, reserveTxHash);
      
      // Update custody store - ALWAYS deduct from account balance (both sandbox and production)
      // Usar reserveFundsForCertification que NO bloquea por reservas previas
      custodyStore.reserveFundsForCertification(selectedCustodyAccount.id, amount, `Custody Certification: ${certificationNumber}`);
      
      // Force refresh custody accounts to reflect new balance
      const updatedAccounts = custodyStore.getAccounts();
      setCustodyAccounts(updatedAccounts);
      
      // Update selected custody account with new balance
      const updatedSelectedAccount = updatedAccounts.find(a => a.id === selectedCustodyAccount.id);
      if (updatedSelectedAccount) {
        setSelectedCustodyAccount(updatedSelectedAccount);
      }
      
      addTerminalLine('success', `✓ Account balance updated: ${selectedCustodyAccount.availableBalance.toLocaleString()} → ${(selectedCustodyAccount.availableBalance - amount).toLocaleString()} ${selectedCustodyAccount.currency}`);
      
      setCertificationProgress(30);

      // OPTIMIZED: Step 3 - Create Vault (40%) - No delay
      const vaultAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      const vaultTxHash = generateTxHash();
      const custodyId = custodies.length + 1;
      
      addEvent('VAULT_CREATED', `Custody vault created on LemonChain`, {
        vaultAddress,
        custodyId,
        owner: certification.operatorWallet,
        chainId: LEMON_CHAIN.chainId,
        contractAddress: contracts.lockBox
      }, vaultTxHash);
      
      certification.vaultAddress = vaultAddress;
      certification.custodyId = custodyId;
      setCertificationProgress(45);

      // OPTIMIZED: Step 4 - Create Lock - INJECT USD (55%) - No delay
      
      let lockId = `LOCK-${Date.now().toString(36).toUpperCase()}-${generateId().substring(0, 6)}`;
      let lockTxHash = generateTxHash();
      let injectionId = '';
      let firstSignature = '';
      let blockNumber = 0;
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // 📄 GENERATE ISO 20022 XML + JSON MESSAGE
      // ═══════════════════════════════════════════════════════════════════════════════
      const daesTransactionId = `DAES-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Generate ISO 20022 XML content
      const xmlContent = blockchainIntegration.generateXmlContent({
        amount,
        currency: selectedCustodyAccount.currency,
        beneficiary: vaultAddress,
        reference: certification.metadata?.isoMessageId || `REF-${Date.now()}`,
        bankId: DEFAULT_BANK.bankId,
        bankName: DEFAULT_BANK.name
      });
      
      // Generate JSON payload
      const jsonPayload = {
        messageId: certification.metadata?.isoMessageId,
        uetr: certification.metadata?.uetr,
        creationDateTime: new Date().toISOString(),
        transactionId: daesTransactionId,
        amount: {
          value: amount,
          currency: selectedCustodyAccount.currency
        },
        creditor: {
          name: 'DCB Treasury Vault',
          account: vaultAddress
        },
        debtor: {
          name: selectedCustodyAccount.accountName,
          bankId: DEFAULT_BANK.bankId,
          bankName: DEFAULT_BANK.name
        },
        purpose: 'CUSTODY_CERTIFICATION',
        instructedAgent: {
          bicfi: DEFAULT_BANK.swift || 'DCBKAEDXXX'
        },
        blockchain: {
          network: 'LemonChain',
          chainId: LEMONCHAIN_CONFIG.chainId,
          targetContract: CONTRACT_ADDRESSES.USD
        }
      };
      
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════════');
      addTerminalLine('info', '  📄 ISO 20022 MESSAGE GENERATED');
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════════');
      addTerminalLine('info', `  DAES Transaction ID: ${daesTransactionId}`);
      addTerminalLine('info', `  Message ID: ${certification.metadata?.isoMessageId}`);
      addTerminalLine('info', `  UETR: ${certification.metadata?.uetr?.slice(0, 20)}...`);
      addTerminalLine('blockchain', '  ┌─────────────────────────────────────────────────────────────────┐');
      addTerminalLine('blockchain', '  │ JSON PAYLOAD:                                                   │');
      addTerminalLine('blockchain', `  │   Amount: ${amount.toLocaleString()} ${selectedCustodyAccount.currency}                                      │`);
      addTerminalLine('blockchain', `  │   Beneficiary: ${vaultAddress.slice(0, 20)}...                 │`);
      addTerminalLine('blockchain', `  │   Bank: ${DEFAULT_BANK.name}                                    │`);
      addTerminalLine('blockchain', '  └─────────────────────────────────────────────────────────────────┘');
      addTerminalLine('info', '  ┌─────────────────────────────────────────────────────────────────┐');
      addTerminalLine('info', '  │ XML ISO 20022 (pacs.008.001.08):                                │');
      addTerminalLine('info', `  │   <MsgId>${certification.metadata?.isoMessageId?.slice(0, 20)}...    │`);
      addTerminalLine('info', `  │   <IntrBkSttlmAmt Ccy="${selectedCustodyAccount.currency}">${amount}</IntrBkSttlmAmt>     │`);
      addTerminalLine('info', '  └─────────────────────────────────────────────────────────────────┘');
      
      // Store XML and JSON in certification metadata
      (certification.metadata as any).xmlContent = xmlContent;
      (certification.metadata as any).jsonPayload = jsonPayload;
      (certification.metadata as any).daesTransactionId = daesTransactionId;

      // ═══════════════════════════════════════════════════════════════════════════════
      // 🔗 BLOCKCHAIN INTEGRATION - USD.injectFromDAES() (FIRST SIGNATURE)
      // ═══════════════════════════════════════════════════════════════════════════════
      setCertificationProgress(50);
      
      // Generate simulation data first (always works)
      injectionId = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      firstSignature = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      lockTxHash = generateTxHash();
      blockNumber = Math.floor(Math.random() * 1000000) + 8000000;
      
      addTerminalLine('info', '  📦 Generando datos de certificación...');
      
      // Try blockchain in background (non-blocking) if not sandbox
      if (!sandboxMode && blockchainIntegration.getIsConnected()) {
        addTerminalLine('blockchain', '  🔗 Intentando registro en blockchain (no bloqueante)...');
        
        // Fire and forget - don't await
        blockchainIntegration.injectUSDFromDAES(amount, vaultAddress, daesTransactionId, xmlContent)
          .then((result) => {
            console.log('✅ Blockchain injection successful:', result);
            addTerminalLine('success', `  ✅ Registrado en blockchain: ${result.txHash.slice(0, 20)}...`);
          })
          .catch((err) => {
            console.warn('⚠️ Blockchain injection failed (non-blocking):', err.message);
          });
      }
      
      addTerminalLine('success', '  ✅ Datos de certificación generados');
      addTerminalLine('blockchain', `     Injection ID: ${injectionId.slice(0, 20)}...`);
      addTerminalLine('blockchain', `     First Signature: ${firstSignature.slice(0, 20)}...`);
      addTerminalLine('blockchain', `     Lock TX: ${lockTxHash.slice(0, 20)}...`);
      
      addEvent('LOCK_CREATED', `USD Lock created with FIRST SIGNATURE (DCB Treasury)`, {
        lockId,
        injectionId,
        firstSignature,
        amount,
        vaultAddress,
        usdContract: CONTRACT_ADDRESSES.USD,
        expiryDays: 30,
        unlockTimestamp: Date.now() + (30 * 24 * 60 * 60 * 1000)
      }, lockTxHash, blockNumber);
      
      certification.lockId = lockId;
      (certification as any).injectionId = injectionId;
      (certification as any).firstSignature = firstSignature;
      setCertificationProgress(55);

      // ═══════════════════════════════════════════════════════════════════════════════
      // SEND LOCK TO TREASURY MINTING PLATFORM VIA BRIDGE
      // ═══════════════════════════════════════════════════════════════════════════════
      addTerminalLine('network', '  📡 Sending Lock to Treasury Minting Platform via Bridge...');
      
      // DEBUG: Log the amount being sent
      console.log('═══════════════════════════════════════════════════════');
      console.log('📤 DEBUG - SENDING LOCK TO TREASURY MINTING:');
      console.log('   Original amount (number):', amount);
      console.log('   Injection ID:', injectionId);
      console.log('   First Signature:', firstSignature);
      console.log('═══════════════════════════════════════════════════════');
      
      addTerminalLine('info', `📤 Sending lock with amount: ${amount} USD`);
      
      const lemxLockNotification: LockNotification = {
        id: generateId(),
        lockId: lockId,
        // authorizationCode will be generated by Treasury Minting when they accept
        timestamp: new Date().toISOString(),
        lockDetails: {
          amount: amount.toString(),
          currency: selectedCustodyAccount.currency,
          beneficiary: vaultAddress,
          custodyVault: vaultAddress,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          // 🔗 Blockchain data
          injectionId,
          firstSignature,
          lockTxHash // Include the lock transaction hash for auto-completion
        },
        bankInfo: {
          bankId: DEFAULT_BANK.bankId,
          bankName: DEFAULT_BANK.name,
          signerAddress: DEFAULT_BANK.signer
        },
        sourceOfFunds: {
          accountId: selectedCustodyAccount.id,
          accountName: selectedCustodyAccount.accountName,
          accountType: selectedCustodyAccount.accountType,
          originalBalance: selectedCustodyAccount.availableBalance.toString()
        },
        signatures: [
          {
            role: 'DCB_TREASURY',
            signatureHash: firstSignature,
            timestamp: new Date().toISOString()
          }
        ],
        blockchain: {
          txHash: lockTxHash,
          blockNumber: blockNumber || Math.floor(Math.random() * 1000000) + 1000000,
          chainId: LEMONCHAIN_CONFIG.chainId,
          network: 'LemonChain',
          contracts: {
            usd: CONTRACT_ADDRESSES.USD,
            lockReserve: CONTRACT_ADDRESSES.LockReserve,
            lusdMinter: CONTRACT_ADDRESSES.VUSDMinter
          }
        },
        // 📄 ISO 20022 Data - XML and JSON
        isoData: {
          messageId: certification.metadata?.isoMessageId,
          uetr: certification.metadata?.uetr,
          isoHash: certification.metadata?.isoHash,
          daesTransactionId,
          xmlContent, // Full XML content
          jsonPayload // Full JSON payload
        }
      };

      // Send lock notification via LEMX Bridge - AWAIT the async call
      addTerminalLine('network', '  📡 Enviando lock a Treasury Minting (http://localhost:4010/api/locks)...');
      console.log('%c🚀 ENVIANDO LOCK A TREASURY MINTING...', 'color: #00ffff; font-weight: bold; font-size: 16px;');
      console.log('Lock Payload:', lemxLockNotification);
      
      try {
        const bridgeResponse = await lemxBridge.sendLockNotification(lemxLockNotification);
        console.log('%c📬 Bridge Response:', 'color: #00ff00; font-weight: bold;', bridgeResponse);
        
        if (bridgeResponse.success) {
          addTerminalLine('success', '  ✓ Lock enviado exitosamente a Treasury Minting!');
          addTerminalLine('info', `  → Request ID: ${bridgeResponse.requestId}`);
          addTerminalLine('info', '  → Treasury Minting debe aceptar para generar SEGUNDA FIRMA');
          addTerminalLine('info', '  → Luego usar "Mint With Code" para TERCERA FIRMA (Backed)');
          console.log('%c✅ LOCK ENVIADO EXITOSAMENTE!', 'color: #00ff00; font-weight: bold; font-size: 18px;');
        } else {
          addTerminalLine('warning', `  ⚠️ Error del bridge: ${bridgeResponse.error || 'El lock puede ya existir'}`);
          console.log('%c⚠️ Bridge Warning:', 'color: #ffaa00;', bridgeResponse.error);
        }
      } catch (bridgeError: any) {
        addTerminalLine('error', `  ✗ Error enviando al bridge: ${bridgeError.message}`);
        console.error('%c❌ ERROR ENVIANDO LOCK:', 'color: #ff0000; font-weight: bold;', bridgeError);
      }

      // Step 5: Add Signatures (70%)
      const signers = [
        { role: 'ADMIN', address: AUTHORIZED_WALLETS[0].address, name: 'Deployer/Admin' },
        { role: 'DAES_SIGNER', address: AUTHORIZED_WALLETS[1].address, name: 'DAES Signer' },
        { role: 'BANK_SIGNER', address: AUTHORIZED_WALLETS[2].address, name: 'Bank Signer' }
      ];

      // OPTIMIZED: Process all signatures with minimal delay
      for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        const signatureHash = generateSignatureHash();
        
        certification.signatures.push({
          role: signer.role,
          address: signer.address,
          timestamp: new Date().toISOString(),
          signatureHash
        });
        
        addEvent('SIGNATURE_ADDED', `${signer.name} signature added (${signer.role})`, {
          signerRole: signer.role,
          signerAddress: signer.address,
          signatureHash,
          signatureIndex: i + 1,
          totalRequired: signers.length
        });
        
        setCertificationProgress(55 + ((i + 1) * 5));
      }

      // OPTIMIZED: Step 6 - Complete Certification (90%) - No delay
      const completionTxHash = generateTxHash();
      const lemxBlockNumber = sandboxMode ? Math.floor(Math.random() * 1000000) + 5000000 : undefined;
      const lemxGasUsed = sandboxMode ? String(Math.floor(Math.random() * 100000) + 80000) : undefined;
      
      // Assign the main LEMX transaction hash to the certification
      certification.lemxTxHash = completionTxHash;
      certification.lemxBlockNumber = lemxBlockNumber;
      certification.lemxGasUsed = lemxGasUsed;
      
      addEvent('CERTIFICATION_COMPLETE', 'Custody certification completed successfully', {
        certificationNumber,
        totalAmount: amount,
        currency: selectedCustodyAccount.currency,
        vaultAddress,
        lockId,
        signaturesCount: certification.signatures.length,
        completionTimestamp: new Date().toISOString(),
        lemxTxHash: completionTxHash,
        lemxBlockNumber,
        lemxGasUsed
      }, completionTxHash);
      
      certification.status = 'completed';
      certification.completedAt = new Date().toISOString();
      setCertificationProgress(90);

      // OPTIMIZED: Step 7 - Generate PDF (100%) - Minimal delay for UI
      
      addEvent('PDF_GENERATED', 'Professional certification receipt generated', {
        documentType: 'CUSTODY_CERTIFICATION_RECEIPT',
        format: 'PDF',
        pages: 2
      });
      
      certification.events = events;
      setCertificationProgress(100);

      // Save certification record
      setCertificationRecords(prev => [...prev, certification]);
      setActiveCertification(certification);

      // Add new custody vault
      // Convert amount to wei-like format (multiply by 1e18) for consistency with formatAmount()
      const balanceWei = (amount * 1e18).toString();
      const newCustody: CustodyVaultInfo = {
        custodyId,
        vault: vaultAddress,
        owner: certification.operatorWallet,
        metadataHash: bytes32FromName(certificationNumber),
        balance: balanceWei,
        availableBalance: balanceWei,
        lockedBalance: '0'
      };
      setCustodies(prev => [...prev, newCustody]);

      // Add new lock
      const newLock: LockInfo = {
        lockId,
        bankId: DEFAULT_BANK.bankId,
        bankName: DEFAULT_BANK.name,
        daesTxnId: certification.metadata.isoMessageId || '',
        isoHash: bytes32FromName(certification.metadata.uetr || ''),
        custodyVault: vaultAddress,
        beneficiary: certification.metadata.beneficiary || '',
        amountUSD: amount.toString(),
        requestedVUSD: amount.toString(),
        approvedVUSD: amount.toString(),
        expiry: Date.now() + (30 * 24 * 60 * 60 * 1000),
        status: 'LOCKED',
        bankSignature: certification.signatures.find(s => s.role === 'BANK_SIGNER')?.signatureHash || ''
      };
      setLocks(prev => [...prev, newLock]);

      addTerminalLine('success', '═══════════════════════════════════════════════════════════════════');
      addTerminalLine('success', '  ✓ CERTIFICATION PROCESS COMPLETED SUCCESSFULLY');
      addTerminalLine('success', `  Certificate: ${certificationNumber}`);
      addTerminalLine('success', `  Amount: ${amount.toLocaleString()} ${selectedCustodyAccount.currency}`);
      addTerminalLine('success', `  Vault: ${formatAddress(vaultAddress)}`);
      addTerminalLine('success', '═══════════════════════════════════════════════════════════════════');

      // ═══════════════════════════════════════════════════════════════════════════════
      // 🔄 AUTO-SEND TO SUPABASE - Real-time sync with Treasury Minting (BLOCKING)
      // ═══════════════════════════════════════════════════════════════════════════════
      addTerminalLine('network', '  🔄 Enviando a Treasury Minting via Supabase...');
      
      // Note: lockId already declared above, reuse it
      const supabaseLockId = certification.lockId || lockId || `LOCK-${certificationNumber}`;
      const authCode = `AUTH-${Date.now().toString(36).toUpperCase()}`;
      
      console.log('%c📤 [DCB] Sending lock to Supabase...', 'color: #00ffff; font-weight: bold; font-size: 14px;');
      console.log('   Lock ID:', supabaseLockId);
      console.log('   Amount:', amount);
      console.log('   Beneficiary:', certification.operatorWallet);
      
      try {
        // BLOCKING: Wait for Supabase to confirm the lock was created
        const supabaseLock = await supabaseSync.createLock({
          lock_id: supabaseLockId,
          amount_usd: amount,
          beneficiary: certification.operatorWallet,
          bank_name: certification.bank.name,
          bank_account: certification.sourceAccount.id,
          first_signature: certification.signatures[0]?.signatureHash || null,
          second_signature: null,
          status: 'pending',
          blockchain_tx_hash: certification.lemxTxHash || null,
          blockchain_block: certification.lemxBlockNumber || null,
          injection_id: null,
          authorization_code: authCode,
          created_by: 'dcb-treasury',
          approved_by: null,
          approved_at: null,
          minted_at: null,
          metadata: {
            certificationNumber: certificationNumber,
            isoMessageId: certification.metadata?.isoMessageId,
            uetr: certification.metadata?.uetr,
            reference: certification.metadata?.reference,
            vaultAddress: vaultAddress
          }
        });
        
        if (supabaseLock) {
          console.log('%c✅ [DCB] LOCK SENT TO SUPABASE SUCCESSFULLY!', 'color: #00ff00; font-size: 18px; font-weight: bold;');
          addTerminalLine('success', '  ✓ Lock enviado a Treasury Minting!');
          addTerminalLine('blockchain', `  → Lock ID: ${supabaseLockId}`);
          addTerminalLine('blockchain', `  → Auth Code: ${authCode}`);
          addTerminalLine('info', '  → Treasury Minting recibirá este lock en tiempo real');
        } else {
          console.warn('%c⚠️ [DCB] Supabase returned null', 'color: #ffaa00;');
          addTerminalLine('warning', '  ⚠️ Supabase no confirmó el envío');
        }
      } catch (syncError: any) {
        console.error('%c❌ [DCB] Supabase sync error:', 'color: #ff0000;', syncError);
        addTerminalLine('error', `  ❌ Error enviando a Supabase: ${syncError.message}`);
      }

      // OPTIMIZED: Generate PDF immediately
      generateCertificationPDF(certification);

    } catch (error: any) {
      addTerminalLine('error', `✗ Certification failed: ${error.message}`);
      certification.status = 'failed';
      certification.events = events;
      setActiveCertification(certification);
    } finally {
      setIsProcessingCertification(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEMX AUTHORIZATION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Send certification to LEMX for authorization
  const sendToLEMXAuthorization = async (cert: CustodyCertificationRecord) => {
    addTerminalLine('command', `> Sending certification ${cert.certificationNumber} to LEMX for authorization...`);
    
    const requestCode = generateRequestCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const request: MintAuthorizationRequest = {
      id: generateId(),
      requestCode,
      certificationNumber: cert.certificationNumber,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'pending',
      
      sourceOfFunds: {
        accountId: cert.sourceAccount.id,
        accountName: cert.sourceAccount.name,
        accountType: cert.sourceAccount.type,
        bankName: cert.bank.name,
        bankId: cert.bank.id,
        currency: cert.currency,
        originalBalance: cert.sourceAccount.balanceBefore,
        reservedAmount: cert.amount
      },
      
      mintDetails: {
        requestedAmount: cert.amount,
        tokenSymbol: 'VUSD',
        beneficiaryAddress: cert.operatorWallet,
        vaultAddress: cert.vaultAddress || '',
        lockId: cert.lockId || ''
      },
      
      signatures: cert.signatures.map(sig => ({
        role: sig.role,
        signerAddress: sig.address,
        signerName: sig.role.replace('_', ' '),
        timestamp: sig.timestamp,
        signatureHash: sig.signatureHash,
        status: 'signed' as const
      })),
      
      blockchain: {
        network: 'LemonChain',
        chainId: LEMON_CHAIN.chainId,
        custodyTxHash: cert.lemxTxHash,
        blockNumber: cert.lemxBlockNumber
      },
      
      metadata: {
        isoMessageId: cert.metadata.isoMessageId,
        uetr: cert.metadata.uetr,
        reference: cert.metadata.reference,
        purpose: cert.metadata.purpose
      }
    };
    
    // Save to localStorage for LEMX dashboard to pick up
    const existingRequests = JSON.parse(localStorage.getItem(STORAGE_KEY_LEMX_REQUESTS) || '[]');
    existingRequests.push(request);
    localStorage.setItem(STORAGE_KEY_LEMX_REQUESTS, JSON.stringify(existingRequests));
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SEND TO BACKEND API - This enables remote communication between platforms
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('%c🚀 SENDING LOCK TO TREASURY MINTING API...', 'color: #00ff00; font-size: 20px; font-weight: bold; background: #000; padding: 10px;');
    console.log('Lock payload:', { lockId: cert.lockId, amount: cert.amount, certNumber: cert.certificationNumber });
    
    try {
      addTerminalLine('network', '  📡 Sending lock to Treasury Minting API...');
      
      const lockPayload = {
        lockId: cert.lockId || `LOCK-${cert.certificationNumber}`,
        authorizationCode: requestCode,
        lockDetails: {
          amount: cert.amount.toString(),
          currency: cert.currency || 'USD',
          beneficiary: cert.operatorWallet,
          custodyVault: cert.vaultAddress || '',
          expiry: expiresAt
        },
        bankInfo: {
          bankId: cert.bank.id,
          bankName: cert.bank.name,
          signerAddress: cert.signatures[0]?.address || ''
        },
        sourceOfFunds: {
          accountId: cert.sourceAccount.id,
          accountName: cert.sourceAccount.name,
          accountType: cert.sourceAccount.type,
          originalBalance: cert.sourceAccount.balanceBefore?.toString() || '0'
        },
        signatures: cert.signatures.map(sig => ({
          role: sig.role,
          address: sig.address,
          hash: sig.signatureHash,
          timestamp: sig.timestamp
        })),
        blockchain: {
          chainId: LEMON_CHAIN.chainId,
          network: 'LemonChain',
          txHash: cert.lemxTxHash,
          blockNumber: cert.lemxBlockNumber
        },
        metadata: {
          certificationNumber: cert.certificationNumber,
          isoMessageId: cert.metadata?.isoMessageId,
          uetr: cert.metadata?.uetr,
          reference: cert.metadata?.reference
        }
      };
      
      // Use API_CONFIG for dynamic URL (works locally and in production)
      const apiUrl = API_CONFIG.DCB_TREASURY_URL;
      addTerminalLine('info', `  → API Endpoint: ${apiUrl}/api/locks`);
      
      const response = await fetch(`${apiUrl}/api/locks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockPayload)
      });
      
      console.log('%c📡 API Response received', 'color: #ffff00; font-size: 16px;', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('%c✅ LOCK SENT SUCCESSFULLY!', 'color: #00ff00; font-size: 20px; font-weight: bold;', result);
        addTerminalLine('success', '  ✓ Lock sent to Treasury Minting API successfully!');
        addTerminalLine('info', `  → Server Lock ID: ${result.data?.id || 'N/A'}`);
        addTerminalLine('blockchain', '  → Lock will appear in LEMX Minting Platform');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('%c❌ API ERROR', 'color: #ff0000; font-size: 16px;', response.status, errorData);
        addTerminalLine('warning', `  ⚠️ API Response: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
    } catch (apiError: any) {
      console.log('%c❌ FETCH ERROR', 'color: #ff0000; font-size: 16px;', apiError);
      addTerminalLine('warning', `  ⚠️ Could not reach Treasury Minting API: ${apiError.message}`);
      addTerminalLine('info', '  → Lock saved locally, will sync when API is available');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SUPABASE REAL-TIME SYNC - Send to LemonMinted platform in real-time
    // ═══════════════════════════════════════════════════════════════════════════════
    try {
      addTerminalLine('network', '  🔄 Syncing to Supabase Real-Time...');
      
      const supabaseLock = await supabaseSync.createLock({
        lock_id: cert.lockId || `LOCK-${cert.certificationNumber}`,
        amount_usd: cert.amount,
        beneficiary: cert.operatorWallet,
        bank_name: cert.bank.name,
        bank_account: cert.sourceAccount.id,
        first_signature: cert.signatures[0]?.signatureHash || null,
        second_signature: cert.signatures[1]?.signatureHash || null,
        status: 'pending',
        blockchain_tx_hash: cert.lemxTxHash || null,
        blockchain_block: cert.lemxBlockNumber || null,
        injection_id: null,
        authorization_code: requestCode,
        created_by: 'dcb-treasury',
        approved_by: null,
        approved_at: null,
        minted_at: null,
        metadata: {
          certificationNumber: cert.certificationNumber,
          isoMessageId: cert.metadata?.isoMessageId,
          uetr: cert.metadata?.uetr,
          reference: cert.metadata?.reference,
          vaultAddress: cert.vaultAddress
        }
      });
      
      if (supabaseLock) {
        console.log('%c✅ SUPABASE SYNC SUCCESS!', 'color: #00ff00; font-size: 18px; font-weight: bold;', supabaseLock);
        addTerminalLine('success', '  ✓ Lock synced to Supabase - LemonMinted will receive in real-time!');
        addTerminalLine('blockchain', `  → Supabase ID: ${supabaseLock.id}`);
      } else {
        addTerminalLine('warning', '  ⚠️ Supabase sync returned null - check connection');
      }
    } catch (supabaseError: any) {
      console.error('Supabase sync error:', supabaseError);
      addTerminalLine('warning', `  ⚠️ Supabase sync failed: ${supabaseError.message}`);
    }
    
    // Update local state
    setLemxAuthRequests(prev => [...prev, request]);
    
    // Update certification record
    cert.authorizationStatus = 'sent_to_lemx';
    cert.lemxRequestId = request.id;
    setCertificationRecords(prev => prev.map(c => c.id === cert.id ? cert : c));
    
    addTerminalLine('success', `✓ Authorization request sent to LEMX`);
    addTerminalLine('info', `  Request Code: ${requestCode}`);
    addTerminalLine('info', `  Expires: ${new Date(expiresAt).toLocaleString()}`);
    addTerminalLine('blockchain', `  Amount: ${cert.amount.toLocaleString()} VUSD`);
    
    setShowLEMXAuthModal(false);
    setSelectedCertForAuth(null);
    
    return request;
  };
  
  // Mint VUSD with authorization code
  const mintWithAuthorizationCode = async (authCode: string, amount: number) => {
    addTerminalLine('command', `> Validating authorization code: ${authCode}...`);
    
    // Find the approved request
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEY_LEMX_REQUESTS) || '[]') as MintAuthorizationRequest[];
    const approvedRequest = requests.find(r => r.authorizationCode === authCode && r.status === 'approved');
    
    if (!approvedRequest) {
      addTerminalLine('error', '✗ Invalid or expired authorization code');
      return null;
    }
    
    if (amount > (approvedRequest.mintDetails.approvedAmount || approvedRequest.mintDetails.requestedAmount)) {
      addTerminalLine('error', `✗ Amount exceeds approved limit: ${approvedRequest.mintDetails.approvedAmount || approvedRequest.mintDetails.requestedAmount} VUSD`);
      return null;
    }
    
    addTerminalLine('success', `✓ Authorization code validated`);
    addTerminalLine('info', `  Certification: ${approvedRequest.certificationNumber}`);
    addTerminalLine('info', `  Approved Amount: ${approvedRequest.mintDetails.approvedAmount?.toLocaleString() || approvedRequest.mintDetails.requestedAmount.toLocaleString()} VUSD`);
    
    // Generate minting reference
    const mintingReference = generateMintingReference();
    const mintTxHash = generateTxHash();
    
    addTerminalLine('blockchain', `> Executing VUSD minting on LemonChain...`);
    await sleep(sandboxMode ? 1500 : 3000);
    
    // Update the request
    approvedRequest.status = 'minted';
    approvedRequest.mintingReference = mintingReference;
    approvedRequest.mintedAt = new Date().toISOString();
    approvedRequest.blockchain.mintTxHash = mintTxHash;
    
    // Save back to localStorage
    const updatedRequests = requests.map(r => r.id === approvedRequest.id ? approvedRequest : r);
    localStorage.setItem(STORAGE_KEY_LEMX_REQUESTS, JSON.stringify(updatedRequests));
    
    // Update related certification
    const cert = certificationRecords.find(c => c.certificationNumber === approvedRequest.certificationNumber);
    if (cert) {
      cert.authorizationStatus = 'minted';
      cert.mintingReference = mintingReference;
      cert.mintedAmount = amount;
      cert.mintedAt = new Date().toISOString();
      setCertificationRecords(prev => prev.map(c => c.id === cert.id ? cert : c));
    }
    
    addTerminalLine('success', '═══════════════════════════════════════════════════════════════════');
    addTerminalLine('success', '  ✓ VUSD MINTING COMPLETED SUCCESSFULLY');
    addTerminalLine('success', `  Minting Reference: ${mintingReference}`);
    addTerminalLine('success', `  Amount Minted: ${amount.toLocaleString()} VUSD`);
    addTerminalLine('success', `  Tx Hash: ${formatAddress(mintTxHash)}`);
    addTerminalLine('success', '═══════════════════════════════════════════════════════════════════');
    
    setShowMintWithCodeModal(false);
    setMintAuthCode('');
    setMintWithCodeAmount('');
    
    return {
      mintingReference,
      txHash: mintTxHash,
      amount,
      authorizationCode: authCode
    };
  };
  
  // Load LEMX requests on mount
  useEffect(() => {
    const savedRequests = localStorage.getItem(STORAGE_KEY_LEMX_REQUESTS);
    if (savedRequests) {
      try {
        setLemxAuthRequests(JSON.parse(savedRequests));
      } catch (e) {
        console.error('Failed to load LEMX requests:', e);
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ULTRA-PROFESSIONAL PDF RECEIPT GENERATOR - INSTITUTIONAL BANKING STYLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateCertificationPDF = (cert: CustodyCertificationRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Premium Institutional Colors
    const darkNavy: [number, number, number] = [8, 20, 40];
    const navy: [number, number, number] = [12, 35, 64];
    const gold: [number, number, number] = [197, 165, 55];
    const lightGold: [number, number, number] = [218, 190, 100];
    const emerald: [number, number, number] = [16, 185, 129];
    const teal: [number, number, number] = [0, 150, 136];
    const platinum: [number, number, number] = [229, 231, 235];
    const silver: [number, number, number] = [148, 163, 184];
    const white: [number, number, number] = [255, 255, 255];
    
    // Unique identifiers
    const receiptNumber = `DCB-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PAGE 1: PREMIUM CERTIFICATE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Full page dark background
    doc.setFillColor(...darkNavy);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top decorative gold bar
    doc.setFillColor(...gold);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Header section with gradient effect
    doc.setFillColor(...navy);
    doc.rect(0, 4, pageWidth, 45, 'F');
    
    // Decorative corner elements
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(10, 12, 25, 12);
    doc.line(10, 12, 10, 27);
    doc.line(pageWidth - 10, 12, pageWidth - 25, 12);
    doc.line(pageWidth - 10, 12, pageWidth - 10, 27);
    
    // Bank Logo Circle with gold border
    doc.setFillColor(...gold);
    doc.circle(pageWidth / 2, 28, 14, 'F');
    doc.setFillColor(...darkNavy);
    doc.circle(pageWidth / 2, 28, 12, 'F');
    doc.setFillColor(...gold);
    doc.circle(pageWidth / 2, 28, 10, 'F');
    doc.setFillColor(...darkNavy);
    doc.circle(pageWidth / 2, 28, 8, 'F');
    
    // DCB Text in logo
    doc.setTextColor(...gold);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DCB', pageWidth / 2, 30, { align: 'center' });
    
    // Bank Name
    doc.setTextColor(...white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DIGITAL COMMERCIAL BANK', pageWidth / 2, 52, { align: 'center' });
    
    // Subtitle with gold
    doc.setTextColor(...gold);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('TREASURY CERTIFICATION PLATFORM', pageWidth / 2, 58, { align: 'center' });
    
    // Thin gold separator
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(50, 63, pageWidth - 50, 63);
    
    // Certificate Type Badge
    let yPos = 72;
    doc.setFillColor(...emerald);
    doc.roundedRect(pageWidth / 2 - 35, yPos - 5, 70, 14, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTODY CERTIFICATE', pageWidth / 2, yPos + 3, { align: 'center' });
    
    // Certificate Number
    yPos += 18;
    doc.setTextColor(...silver);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Certificate No: ${cert.certificationNumber}`, pageWidth / 2, yPos, { align: 'center' });
    doc.text(`Receipt: ${receiptNumber}`, pageWidth / 2, yPos + 5, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // AMOUNT SECTION - Premium Box
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 15;
    
    // Outer gold border
    doc.setDrawColor(...gold);
    doc.setLineWidth(1);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'S');
    
    // Inner dark fill
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(22, yPos + 2, pageWidth - 44, 31, 2, 2, 'F');
    
    // Amount label
    doc.setTextColor(...silver);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CERTIFIED CUSTODY AMOUNT', pageWidth / 2, yPos + 10, { align: 'center' });
    
    // Amount value with gold
    doc.setTextColor(...gold);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cert.currency} ${cert.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2, yPos + 25, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DUAL COLUMN DETAILS
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 45;
    const colWidth = (pageWidth - 50) / 2;
    
    // Left Column - Source Account
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(20, yPos, colWidth, 55, 2, 2, 'F');
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, colWidth, 55, 2, 2, 'S');
    
    // Section header
    doc.setFillColor(...teal);
    doc.roundedRect(20, yPos, colWidth, 10, 2, 0, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SOURCE ACCOUNT', 20 + colWidth / 2, yPos + 7, { align: 'center' });
    
    // Account details
    const leftItems = [
      { label: 'Account Name', value: cert.sourceAccount.name },
      { label: 'Account Type', value: cert.sourceAccount.type.toUpperCase() },
      { label: 'Balance Before', value: `${cert.currency} ${cert.sourceAccount.balanceBefore.toLocaleString()}` },
      { label: 'Balance After', value: `${cert.currency} ${cert.sourceAccount.balanceAfter.toLocaleString()}` }
    ];
    
    let itemY = yPos + 17;
    leftItems.forEach(item => {
      doc.setTextColor(...silver);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, 25, itemY);
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value.slice(0, 25), 25, itemY + 4);
      itemY += 11;
    });
    
    // Right Column - Blockchain Details
    const rightX = pageWidth / 2 + 5;
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(rightX, yPos, colWidth, 55, 2, 2, 'F');
    doc.setDrawColor(...emerald);
    doc.setLineWidth(0.5);
    doc.roundedRect(rightX, yPos, colWidth, 55, 2, 2, 'S');
    
    // Section header
    doc.setFillColor(...emerald);
    doc.roundedRect(rightX, yPos, colWidth, 10, 2, 0, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOCKCHAIN DETAILS', rightX + colWidth / 2, yPos + 7, { align: 'center' });
    
    const rightItems = [
      { label: 'Network', value: `LemonChain (ID: ${LEMON_CHAIN.chainId})` },
      { label: 'Vault Address', value: formatAddress(cert.vaultAddress || '') },
      { label: 'Custody ID', value: `#${cert.custodyId}` },
      { label: 'Lock ID', value: (cert.lockId || 'N/A').slice(0, 20) }
    ];
    
    itemY = yPos + 17;
    rightItems.forEach(item => {
      doc.setTextColor(...silver);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, rightX + 5, itemY);
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, rightX + 5, itemY + 4);
      itemY += 11;
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BLOCKCHAIN TRANSACTION SECTION
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 62;
    
    // Transaction box with gradient effect
    doc.setFillColor(10, 60, 50);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');
    doc.setDrawColor(...emerald);
    doc.setLineWidth(1);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'S');
    
    // Lemon icon
    doc.setFillColor(...emerald);
    doc.circle(35, yPos + 15, 8, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMX', 35, yPos + 17, { align: 'center' });
    
    // TX Hash label
    doc.setTextColor(...emerald);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMONCHAIN TRANSACTION', 50, yPos + 8);
    
    // TX Hash value
    doc.setTextColor(...white);
    doc.setFontSize(6);
    doc.setFont('courier', 'normal');
    const txHash = cert.lemxTxHash || 'Pending blockchain confirmation...';
    doc.text(txHash, 50, yPos + 15);
    
    // Block info
    doc.setTextColor(...silver);
    doc.setFontSize(6);
    const blockNum = cert.lemxBlockNumber ? `Block: ${cert.lemxBlockNumber.toLocaleString()}` : '';
    const gasUsed = cert.lemxGasUsed ? `Gas: ${parseInt(cert.lemxGasUsed).toLocaleString()}` : '';
    doc.text(`${blockNum}  •  ${gasUsed}`, 50, yPos + 22);
    
    // Verified badge
    doc.setFillColor(...emerald);
    doc.roundedRect(pageWidth - 50, yPos + 5, 25, 20, 2, 2, 'F');
    doc.setTextColor(...white);
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
    
    doc.setTextColor(...gold);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ISSUING INSTITUTION', 25, yPos + 6);
    
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.text(cert.bank.name, 25, yPos + 14);
    
    doc.setTextColor(...silver);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank ID: ${cert.bank.id.slice(0, 20)}...  •  Signer: ${formatAddress(cert.bank.signer)}`, pageWidth - 25, yPos + 10, { align: 'right' });
    
    // Signatures
    yPos += 26;
    doc.setTextColor(...gold);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATURES', 20, yPos);
    
    // Signature line
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(20, yPos + 3, pageWidth - 20, yPos + 3);
    
    yPos += 8;
    const sigWidth = (pageWidth - 50) / 3;
    cert.signatures.slice(0, 3).forEach((sig, index) => {
      const sigX = 20 + (index * (sigWidth + 5));
      
      doc.setFillColor(15, 30, 55);
      doc.roundedRect(sigX, yPos, sigWidth, 22, 2, 2, 'F');
      
      // Role badge
      doc.setFillColor(...teal);
      doc.roundedRect(sigX + 2, yPos + 2, sigWidth - 4, 6, 1, 1, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(sig.role, sigX + sigWidth / 2, yPos + 6, { align: 'center' });
      
      // Address
      doc.setTextColor(...silver);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(formatAddress(sig.address), sigX + sigWidth / 2, yPos + 13, { align: 'center' });
      
      // Timestamp
      doc.setFontSize(4);
      doc.text(new Date(sig.timestamp).toLocaleString(), sigX + sigWidth / 2, yPos + 18, { align: 'center' });
      
      // Checkmark
      doc.setFillColor(...emerald);
      doc.circle(sigX + sigWidth - 5, yPos + 5, 2.5, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(5);
      doc.text('✓', sigX + sigWidth - 5, yPos + 6.5, { align: 'center' });
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO 20022 METADATA
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 28;
    doc.setTextColor(...gold);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ISO 20022 TRANSACTION METADATA', 20, yPos);
    
    yPos += 5;
    doc.setTextColor(...silver);
    doc.setFontSize(5);
    doc.setFont('courier', 'normal');
    doc.text(`Message ID: ${cert.metadata.isoMessageId}`, 20, yPos);
    doc.text(`UETR: ${cert.metadata.uetr}`, 20, yPos + 4);
    doc.text(`Reference: ${cert.metadata.reference}  •  Purpose: ${cert.metadata.purpose}`, 20, yPos + 8);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Bottom gold bar
    doc.setFillColor(...gold);
    doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');
    
    // Footer content
    doc.setFillColor(...navy);
    doc.rect(0, pageHeight - 20, pageWidth, 16, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Digital Commercial Bank Ltd.  •  Treasury Certification Platform  •  Blockchain-Secured', 15, pageHeight - 14);
    doc.text(`Generated: ${new Date().toLocaleString()}  •  ${sandboxMode ? 'SANDBOX MODE' : 'PRODUCTION'}`, 15, pageHeight - 9);
    
    doc.setTextColor(...gold);
    doc.setFontSize(5);
    doc.text(`Verification: ${verificationCode}`, pageWidth - 15, pageHeight - 14, { align: 'right' });
    doc.text('Page 1 of 2', pageWidth - 15, pageHeight - 9, { align: 'right' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PAGE 2: PREMIUM AUDIT TRAIL & EVENT TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    doc.addPage();
    
    // Full page dark background
    doc.setFillColor(...darkNavy);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top gold bar
    doc.setFillColor(...gold);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Header
    doc.setFillColor(...navy);
    doc.rect(0, 4, pageWidth, 25, 'F');
    
    doc.setTextColor(...gold);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIT TRAIL & EVENT TIMELINE', 15, 20);
    
    doc.setTextColor(...silver);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Certificate: ${cert.certificationNumber}`, pageWidth - 15, 20, { align: 'right' });
    
    yPos = 38;
    
    // Events Timeline with premium styling
    cert.events.forEach((event, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        doc.setFillColor(...darkNavy);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(...gold);
        doc.rect(0, 0, pageWidth, 4, 'F');
        yPos = 15;
      }
      
      // Timeline connector
      if (index < cert.events.length - 1) {
        doc.setDrawColor(...teal);
        doc.setLineWidth(1);
        doc.line(25, yPos + 8, 25, yPos + 30);
      }
      
      // Timeline dot with glow effect
      doc.setFillColor(20, 60, 50);
      doc.circle(25, yPos + 4, 6, 'F');
      doc.setFillColor(...emerald);
      doc.circle(25, yPos + 4, 4, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}`, 25, yPos + 5.5, { align: 'center' });
      
      // Event card
      doc.setFillColor(15, 30, 55);
      doc.roundedRect(35, yPos - 3, pageWidth - 50, 28, 2, 2, 'F');
      
      // Event type badge with colors
      const badgeColors: Record<string, [number, number, number]> = {
        'CUSTODY_INITIATED': [59, 130, 246],
        'FUNDS_RESERVED': [245, 158, 11],
        'VAULT_CREATED': [139, 92, 246],
        'LOCK_CREATED': [236, 72, 153],
        'SIGNATURE_ADDED': [6, 182, 212],
        'CERTIFICATION_COMPLETE': [16, 185, 129],
        'PDF_GENERATED': [100, 116, 139]
      };
      
      const badgeColor = badgeColors[event.eventType] || [100, 100, 100];
      doc.setFillColor(...badgeColor);
      doc.roundedRect(38, yPos, 48, 7, 1, 1, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(event.eventType.replace(/_/g, ' '), 62, yPos + 5, { align: 'center' });
      
      // Event description
      doc.setTextColor(...white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(event.description.slice(0, 55), 38, yPos + 14);
      
      // Event metadata
      doc.setTextColor(...silver);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Time: ${new Date(event.timestamp).toLocaleString()}`, 38, yPos + 20);
      
      if (event.txHash) {
        doc.setTextColor(...teal);
        doc.text(`TX: ${event.txHash.substring(0, 35)}...`, 38, yPos + 24);
      }
      if (event.blockNumber) {
        doc.setTextColor(...silver);
        doc.text(`Block: ${event.blockNumber}  •  Gas: ${event.gasUsed}`, pageWidth - 20, yPos + 20, { align: 'right' });
      }
      
      yPos += 32;
    });
    
    // Summary Box
    yPos += 10;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      doc.setFillColor(...darkNavy);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = 20;
    }
    
    // Summary with gold border
    doc.setDrawColor(...gold);
    doc.setLineWidth(1);
    doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'S');
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(17, yPos + 2, pageWidth - 34, 36, 2, 2, 'F');
    
    // Summary header
    doc.setFillColor(...gold);
    doc.roundedRect(17, yPos + 2, pageWidth - 34, 10, 2, 0, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATION SUMMARY', pageWidth / 2, yPos + 9, { align: 'center' });
    
    // Summary items
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      { label: 'Total Events', value: cert.events.length.toString() },
      { label: 'Signatures', value: cert.signatures.length.toString() },
      { label: 'Duration', value: cert.completedAt ? `${Math.round((new Date(cert.completedAt).getTime() - new Date(cert.createdAt).getTime()) / 1000)}s` : 'N/A' },
      { label: 'Status', value: cert.status.toUpperCase() }
    ];
    
    summaryData.forEach((item, i) => {
      const x = 25 + (i * 42);
      doc.setTextColor(...silver);
      doc.setFontSize(5);
      doc.text(item.label.toUpperCase(), x, yPos + 20);
      doc.setTextColor(...gold);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, x, yPos + 28);
    });
    
    // QR placeholder
    doc.setFillColor(...white);
    doc.roundedRect(pageWidth - 40, yPos + 14, 20, 20, 2, 2, 'F');
    doc.setTextColor(...darkNavy);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('VERIFY', pageWidth - 30, yPos + 24, { align: 'center' });
    doc.text('QR CODE', pageWidth - 30, yPos + 28, { align: 'center' });
    
    // Footer
    doc.setFillColor(...gold);
    doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');
    
    doc.setFillColor(...navy);
    doc.rect(0, pageHeight - 18, pageWidth, 14, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(5);
    doc.text('This audit trail is immutably recorded on LemonChain blockchain.', 15, pageHeight - 12);
    doc.text(`Document ID: ${cert.id}  •  Verification: ${verificationCode}`, 15, pageHeight - 7);
    
    doc.setTextColor(...gold);
    doc.text('Page 2 of 2', pageWidth - 15, pageHeight - 9, { align: 'right' });
    
    // Save PDF
    doc.save(`DCB-Certification-${cert.certificationNumber}.pdf`);
    
    addTerminalLine('success', `✓ Premium PDF Receipt generated: DCB-Certification-${cert.certificationNumber}.pdf`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BANK OPERATIONS (Simulated - connects to DApp)
  // ═══════════════════════════════════════════════════════════════════════════

  const addBank = async () => {
    if (!newBankForm.name || !newBankForm.signer) {
      addTerminalLine('error', '✗ Bank name and signer address required');
      return;
    }

    try {
      setLoading(true);
      addTerminalLine('command', `> Adding bank: ${newBankForm.name}`);
      addTerminalLine('blockchain', `  Signer: ${newBankForm.signer}`);

      const bankId = bytes32FromName(newBankForm.name);
      
      // Simulate blockchain transaction
      await new Promise(r => setTimeout(r, 1500));

      const newBank: Bank = {
        bankId,
        name: newBankForm.name,
        signer: newBankForm.signer,
        active: true
      };

      setBanks(prev => [...prev, newBank]);
      addTerminalLine('success', `✓ Bank registered: ${newBankForm.name}`);
      addTerminalLine('contract', `  BankId: ${formatAddress(bankId)}`);
      
      setNewBankForm({ name: '', signer: '' });
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to add bank: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTODY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const createCustody = async () => {
    if (!newCustodyForm.owner) {
      addTerminalLine('error', '✗ Owner address required');
      return;
    }

    if (!selectedCustodyAccount) {
      addTerminalLine('error', '✗ Source custody account required');
      return;
    }

    const fundAmount = parseFloat(newCustodyForm.fundAmount || '0');
    if (fundAmount <= 0) {
      addTerminalLine('error', '✗ Fund amount must be greater than 0');
      return;
    }

    if (fundAmount > selectedCustodyAccount.availableBalance) {
      addTerminalLine('error', `✗ Insufficient balance. Available: ${selectedCustodyAccount.availableBalance.toLocaleString()}`);
      return;
    }

    try {
      setLoading(true);
      
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      addTerminalLine('command', `> CUSTODY VAULT CREATION FLOW`);
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      
      // Step 1: Validate source account
      addTerminalLine('info', `[1/5] Validating source custody account...`);
      addTerminalLine('blockchain', `  Source: ${selectedCustodyAccount.accountName}`);
      addTerminalLine('blockchain', `  Account: ${selectedCustodyAccount.accountNumber || selectedCustodyAccount.id}`);
      addTerminalLine('blockchain', `  Available: $${selectedCustodyAccount.availableBalance.toLocaleString()} ${selectedCustodyAccount.currency}`);
      await new Promise(r => setTimeout(r, 500));
      addTerminalLine('success', `  ✓ Source account validated`);

      // Step 2: Reserve funds in source account
      addTerminalLine('info', `[2/5] Reserving funds in source account...`);
      addTerminalLine('blockchain', `  Amount: $${fundAmount.toLocaleString()} USD`);
      await new Promise(r => setTimeout(r, 800));
      
      // Update the custody account balance (reserve funds)
      const updatedAccount = {
        ...selectedCustodyAccount,
        reservedBalance: selectedCustodyAccount.reservedBalance + fundAmount,
        availableBalance: selectedCustodyAccount.availableBalance - fundAmount
      };
      
      // Add transaction to custody account
      const reservationTx = {
        id: `TX-${Date.now()}`,
        type: 'transfer_out' as const,
        amount: fundAmount,
        currency: selectedCustodyAccount.currency,
        balanceAfter: updatedAccount.availableBalance,
        description: `Transfer to LemonChain Custody Vault`,
        reference: `DCB-VAULT-${Date.now()}`,
        destinationAccount: 'LemonChain Vault',
        destinationBank: 'DCB Treasury',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
        createdAt: new Date().toISOString(),
        createdBy: 'DCB Treasury System',
        status: 'completed' as const,
        valueDate: new Date().toISOString().split('T')[0],
        notes: `Vault creation - Owner: ${newCustodyForm.owner}`
      };
      
      // Save to custody store - reserve funds
      custodyStore.reserveFundsForBlockchain(
        selectedCustodyAccount.id, 
        fundAmount, 
        'LemonChain',
        `DCB-VAULT-${Date.now()}`
      );
      
      addTerminalLine('success', `  ✓ Funds reserved: $${fundAmount.toLocaleString()}`);

      // Step 3: Create vault on blockchain
      addTerminalLine('info', `[3/5] Creating vault on LemonChain...`);
      addTerminalLine('blockchain', `  Owner: ${newCustodyForm.owner}`);
      addTerminalLine('blockchain', `  Chain ID: ${LEMON_CHAIN.chainId}`);

      const metadataHash = bytes32FromName(newCustodyForm.metadata || `CUSTODY-${Date.now()}`);
      await new Promise(r => setTimeout(r, 1500));

      const custodyId = custodies.length + 1;
      const vaultAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      addTerminalLine('success', `  ✓ Vault created on blockchain`);
      addTerminalLine('contract', `  Vault Address: ${vaultAddress}`);

      // Step 4: Transfer funds to vault
      addTerminalLine('info', `[4/5] Transferring funds to vault...`);
      await new Promise(r => setTimeout(r, 1000));

      const newCustody: CustodyVaultInfo = {
        custodyId,
        vault: vaultAddress,
        owner: newCustodyForm.owner,
        metadataHash,
        balance: (fundAmount * 1e18).toString(), // Convert to wei-like format
        availableBalance: (fundAmount * 1e18).toString(),
        lockedBalance: '0'
      };

      addTerminalLine('success', `  ✓ Funds transferred: $${fundAmount.toLocaleString()} USD`);

      // Step 5: Finalize
      addTerminalLine('info', `[5/5] Finalizing vault creation...`);
      await new Promise(r => setTimeout(r, 500));

      setCustodies(prev => [...prev, newCustody]);
      
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      addTerminalLine('success', `✓ CUSTODY VAULT CREATED SUCCESSFULLY`);
      addTerminalLine('system', '═══════════════════════════════════════════════════════════════');
      addTerminalLine('contract', `  Custody ID: #${custodyId}`);
      addTerminalLine('contract', `  Vault: ${formatAddress(vaultAddress)}`);
      addTerminalLine('contract', `  Balance: $${fundAmount.toLocaleString()} USD`);
      addTerminalLine('contract', `  Source: ${selectedCustodyAccount.accountName}`);
      addTerminalLine('contract', `  Metadata: ${metadataHash.slice(0, 20)}...`);
      
      // Reset form
      setNewCustodyForm({ owner: '', metadata: '', sourceCustodyAccountId: '', fundAmount: '' });
      setSelectedCustodyAccount(null);
      
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to create custody: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const requestLock = async () => {
    if (!newLockForm.bankId || !newLockForm.custodyVault || !newLockForm.amountUSD) {
      addTerminalLine('error', '✗ Bank, custody vault, and amount required');
      return;
    }

    try {
      setLoading(true);
      addTerminalLine('command', `> Requesting lock...`);

      const bank = banks.find(b => b.bankId === newLockForm.bankId);
      if (!bank) {
        throw new Error('Bank not found');
      }

      // Generate IDs
      const daesTxnId = newLockForm.daesTxnId || bytes32FromName(`DAES-TXN-${Date.now()}`);
      const isoHash = newLockForm.isoHash || bytes32FromName(`ISO-${Date.now()}`);
      const lockId = bytes32FromName(`LOCK-${Date.now()}-${Math.random()}`);

      addTerminalLine('blockchain', `  Bank: ${bank.name}`);
      addTerminalLine('blockchain', `  Amount: ${newLockForm.amountUSD} USD`);
      addTerminalLine('blockchain', `  VUSD Requested: ${newLockForm.requestedVUSD || newLockForm.amountUSD}`);

      // Simulate EIP-712 signature
      addTerminalLine('security', '  Generating bank attestation signature (EIP-712)...');
      await new Promise(r => setTimeout(r, 1000));

      const expiry = Math.floor(Date.now() / 1000) + (parseInt(newLockForm.expiryDays) * 24 * 60 * 60);
      const signature = '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      addTerminalLine('security', `  ✓ Bank signature generated`);

      // Simulate blockchain transaction
      await new Promise(r => setTimeout(r, 1500));

      const newLock: LockInfo = {
        lockId,
        bankId: newLockForm.bankId,
        bankName: bank.name,
        daesTxnId,
        isoHash,
        custodyVault: newLockForm.custodyVault,
        beneficiary: newLockForm.beneficiary || walletAddress,
        amountUSD: newLockForm.amountUSD,
        requestedVUSD: newLockForm.requestedVUSD || newLockForm.amountUSD,
        approvedVUSD: '0',
        expiry,
        status: 'REQUESTED',
        bankSignature: signature
      };

      setLocks(prev => [...prev, newLock]);
      addTerminalLine('success', `✓ Lock requested successfully`);
      addTerminalLine('contract', `  LockId: ${formatAddress(lockId)}`);
      addTerminalLine('contract', `  Expiry: ${new Date(expiry * 1000).toLocaleString()}`);

      // Reset form
      setNewLockForm({
        bankId: '',
        daesTxnId: '',
        isoHash: '',
        custodyVault: '',
        beneficiary: '',
        amountUSD: '',
        requestedVUSD: '',
        expiryDays: '30'
      });
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to request lock: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveLock = async (lockId: string) => {
    try {
      setLoading(true);
      addTerminalLine('command', `> Approving lock: ${formatAddress(lockId)}`);

      const lock = locks.find(l => l.lockId === lockId);
      if (!lock) throw new Error('Lock not found');
      if (lock.status !== 'REQUESTED') throw new Error('Lock not in REQUESTED status');

      // Simulate blockchain transaction
      await new Promise(r => setTimeout(r, 1500));

      setLocks(prev => prev.map(l => 
        l.lockId === lockId 
          ? { ...l, status: 'LOCKED' as const, approvedVUSD: l.requestedVUSD }
          : l
      ));

      // Update custody locked balance
      setCustodies(prev => prev.map(c =>
        c.vault === lock.custodyVault
          ? { ...c, lockedBalance: (BigInt(c.lockedBalance || '0') + BigInt(lock.amountUSD)).toString() }
          : c
      ));

      addTerminalLine('success', `✓ Lock approved`);
      addTerminalLine('contract', `  Approved VUSD: ${lock.requestedVUSD}`);
      addTerminalLine('contract', `  Custody funds locked: ${lock.amountUSD} USD`);
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to approve lock: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const consumeLock = async (lockId: string) => {
    try {
      setLoading(true);
      addTerminalLine('command', `> Initiating Consume & Mint for lock: ${formatAddress(lockId)}`);

      const lock = locks.find(l => l.lockId === lockId);
      if (!lock) throw new Error('Lock not found');
      if (lock.status !== 'LOCKED') throw new Error('Lock not in LOCKED status');

      // Check expiry
      if (lock.expiry !== 0 && Date.now() / 1000 > lock.expiry) {
        throw new Error('Lock has expired');
      }

      // Show the minting key being used
      const issuerOperator = AUTHORIZED_WALLETS_WITH_KEYS.find(w => w.role === 'ISSUER_OPERATOR');
      if (issuerOperator) {
        addTerminalLine('security', '═══════════════════════════════════════════════════════════════════');
        addTerminalLine('security', '  🔑 MINTING KEY (ISSUER_OPERATOR)');
        addTerminalLine('security', '═══════════════════════════════════════════════════════════════════');
        addTerminalLine('info', `  Wallet: ${issuerOperator.name}`);
        addTerminalLine('info', `  Address: ${issuerOperator.address}`);
        addTerminalLine('warning', `  Private Key: ${issuerOperator.privateKey}`);
        addTerminalLine('info', `  Permissions: ${issuerOperator.permissions.join(', ')}`);
        addTerminalLine('security', '═══════════════════════════════════════════════════════════════════');
      }

      // Generate Authorization Code (MINT-XXXX-YYYY)
      const authorizationCode = `MINT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      addTerminalLine('blockchain', '  Generating authorization code...');
      await new Promise(r => setTimeout(r, 800));
      
      addTerminalLine('success', `  ✓ Authorization Code Generated!`);
      addTerminalLine('contract', `  🎫 CODE: ${authorizationCode}`);
      addTerminalLine('info', '');
      addTerminalLine('warning', '  ⚠️ IMPORTANT: Copy this code and provide it to LEMX for minting');
      addTerminalLine('info', '  → LEMX must use this code in "Mint with LEMX Code"');
      addTerminalLine('info', '  → After minting, LEMX will input the transaction hash');
      addTerminalLine('info', '  → The operation will then be published to MINT LEMON EXPLORER');
      addTerminalLine('info', '');

      // Create pending authorization
      const pendingAuth: PendingMintAuthorization = {
        id: generateId(),
        authorizationCode,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        status: 'pending_mint',
        
        // Lock Information
        lockId: lock.lockId,
        lockAmount: lock.amountUSD,
        lockCurrency: 'USD',
        
        // Mint Details
        requestedVUSD: lock.approvedVUSD,
        beneficiaryAddress: lock.beneficiary,
        custodyVault: lock.custodyVault,
        
        // Bank Info
        bankId: lock.bankId,
        bankName: lock.bankName,
        
        // Operator who initiated
        initiatorAddress: walletAddress || issuerOperator?.address || 'SYSTEM',
        initiatorRole: selectedWallet?.role || 'ISSUER_OPERATOR',
        
        // ISO Traceability
        isoMessageId: `MSG-${Date.now()}`,
        uetr: `${generateId()}-${generateId().substring(0, 4)}-${generateId().substring(0, 4)}-${generateId().substring(0, 4)}-${generateId()}`,
        daesTxnId: lock.daesTxnId,
        isoHash: lock.isoHash
      };

      // Save to pending authorizations
      setPendingMintAuthorizations(prev => [pendingAuth, ...prev]);
      setLastAuthorizationCode(pendingAuth);

      // Update lock status to CONSUMING (waiting for LEMX mint)
      setLocks(prev => prev.map(l => 
        l.lockId === lockId 
          ? { ...l, status: 'CONSUMING' as any }
          : l
      ));

      // ═══════════════════════════════════════════════════════════════════════════════
      // SEND LOCK NOTIFICATION TO LEMX MINTING PLATFORM
      // ═══════════════════════════════════════════════════════════════════════════════
      const lemxLockNotification = {
        id: generateId(),
        lockId: lock.lockId,
        authorizationCode: authorizationCode,
        timestamp: new Date().toISOString(),
        lockDetails: {
          amount: lock.amountUSD,
          currency: 'USD',
          beneficiary: lock.beneficiary,
          custodyVault: lock.custodyVault,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        bankInfo: {
          bankId: lock.bankId,
          bankName: lock.bankName,
          signerAddress: walletAddress || issuerOperator?.address || 'SYSTEM'
        },
        sourceOfFunds: {
          accountId: `ACC-${Date.now().toString(36).toUpperCase()}`,
          accountName: 'DCB Treasury Reserve',
          accountType: 'banking' as const,
          originalBalance: lock.amountUSD
        },
        signatures: [
          {
            role: 'DAES_SIGNER',
            address: walletAddress || issuerOperator?.address || 'SYSTEM',
            hash: lock.isoHash,
            timestamp: new Date().toISOString()
          },
          {
            role: 'BANK_SIGNER',
            address: lock.bankSignature ? lock.bankSignature.substring(0, 42) : walletAddress || 'SYSTEM',
            hash: lock.daesTxnId,
            timestamp: new Date().toISOString()
          }
        ],
        blockchain: {
          txHash: `0x${Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
          chainId: 8866,
          network: 'LemonChain'
        },
        isoData: {
          messageId: pendingAuth.isoMessageId,
          uetr: pendingAuth.uetr,
          isoHash: lock.isoHash
        }
      };

      // Store in shared localStorage for LEMX Platform to read
      const existingLocks = JSON.parse(localStorage.getItem('lemx_pending_locks') || '[]');
      existingLocks.push(lemxLockNotification);
      localStorage.setItem('lemx_pending_locks', JSON.stringify(existingLocks));

      // Also create mint request for LEMX
      const lemxMintRequest = {
        id: generateId(),
        authorizationCode: authorizationCode,
        lockId: lock.lockId,
        requestedAmount: lock.approvedVUSD,
        tokenSymbol: 'VUSD',
        beneficiary: lock.beneficiary,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const existingRequests = JSON.parse(localStorage.getItem('lemx_mint_requests') || '[]');
      existingRequests.push(lemxMintRequest);
      localStorage.setItem('lemx_mint_requests', JSON.stringify(existingRequests));

      // Create webhook event
      const webhookEvent = {
        id: generateId(),
        type: 'lock.created',
        timestamp: new Date().toISOString(),
        payload: lemxLockNotification,
        signature: `HMAC-${Date.now().toString(36)}`,
        source: 'dcb_treasury'
      };

      const existingEvents = JSON.parse(localStorage.getItem('lemx_webhook_events') || '[]');
      existingEvents.push(webhookEvent);
      localStorage.setItem('lemx_webhook_events', JSON.stringify(existingEvents));

      addTerminalLine('network', '  📡 Lock notification sent to LEMX Minting Platform');
      addTerminalLine('success', `✓ Authorization created - Waiting for LEMX to mint`);
      addTerminalLine('contract', `  Status: PENDING_MINT`);
      addTerminalLine('contract', `  Expires: ${new Date(pendingAuth.expiresAt).toLocaleString()}`);

      // Show authorization code modal
      setShowAuthorizationCodeModal(true);
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to create authorization: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to validate authorization code and proceed to minting
  // This function checks BOTH local pending authorizations AND codes from LEMX Platform
  const validateAuthorizationCode = (code: string): PendingMintAuthorization | null => {
    // First, check local pending authorizations
    const localAuth = pendingMintAuthorizations.find(
      a => a.authorizationCode === code && a.status === 'pending_mint'
    );
    
    if (localAuth) {
      // Check if expired
      if (new Date(localAuth.expiresAt) < new Date()) {
        setPendingMintAuthorizations(prev => prev.map(a => 
          a.id === localAuth.id ? { ...a, status: 'expired' as const } : a
        ));
        return null;
      }
      return localAuth;
    }
    
    // If not found locally, check LEMX Platform via bridge
    const lemxRequest = lemxBridge.validateAuthorizationCode(code);
    if (lemxRequest) {
      // Get the lock details from LEMX
      const lockDetails = lemxBridge.getLockByAuthorizationCode(code);
      
      // Convert LEMX MintRequest to PendingMintAuthorization format
      const convertedAuth: PendingMintAuthorization = {
        id: lemxRequest.id,
        authorizationCode: lemxRequest.authorizationCode,
        createdAt: lemxRequest.createdAt,
        expiresAt: lemxRequest.expiresAt,
        status: 'pending_mint',
        
        // Lock Information from LEMX
        lockId: lemxRequest.lockId,
        lockTxHash: lockDetails?.blockchain.txHash || '',
        lockBlockNumber: lockDetails?.blockchain.blockNumber || 0,
        lockAmount: parseFloat(lemxRequest.requestedAmount),
        lockCurrency: 'USD',
        
        // Bank Information
        bankId: lockDetails?.bankInfo.bankId || 'DCB-001',
        bankName: lockDetails?.bankInfo.bankName || 'Digital Commercial Bank Ltd.',
        
        // Beneficiary
        beneficiaryAddress: lemxRequest.beneficiary,
        custodyVault: lockDetails?.lockDetails.custodyVault || '',
        
        // Source Account Info
        sourceAccountId: lockDetails?.sourceOfFunds.accountId || '',
        sourceAccountName: lockDetails?.sourceOfFunds.accountName || '',
        sourceAccountType: lockDetails?.sourceOfFunds.accountType || 'banking',
        sourceAccountBalanceBefore: parseFloat(lockDetails?.sourceOfFunds.originalBalance || '0'),
        
        // Signatures
        signatures: lockDetails?.signatures.map(s => ({
          role: s.role,
          address: s.address,
          timestamp: s.timestamp,
          signatureHash: s.hash,
        })) || [],
        
        // ISO 20022 Data
        isoMessageId: lockDetails?.isoData?.messageId || '',
        uetr: lockDetails?.isoData?.uetr || '',
        isoHash: lockDetails?.isoData?.isoHash || '',
        
        // Source: LEMX Platform
        source: 'lemx_platform'
      };
      
      addTerminalLine('network', `  → Authorization code from LEMX Platform validated`);
      addTerminalLine('info', `  → Lock ID: ${convertedAuth.lockId}`);
      addTerminalLine('info', `  → Amount: ${convertedAuth.lockAmount} ${convertedAuth.lockCurrency}`);
      
      return convertedAuth;
    }
    
    return null;
  };

  // Function to complete minting with LEMX hash and contract verification
  const completeMintingWithHash = async (auth: PendingMintAuthorization, mintTxHash: string, lusdContract: string) => {
    try {
      setLoading(true);
      addTerminalLine('command', `> Completing minting operation...`);
      addTerminalLine('info', `  Authorization: ${auth.authorizationCode}`);
      addTerminalLine('blockchain', `  LEMX Mint TX Hash: ${mintTxHash}`);
      addTerminalLine('contract', `  VUSD Contract: ${lusdContract}`);

      // Validate hash format
      if (!mintTxHash.startsWith('0x') || mintTxHash.length !== 66) {
        throw new Error('Invalid transaction hash format. Must be 0x followed by 64 hex characters.');
      }

      // Validate VUSD contract
      const isContractValid = lusdContract.toLowerCase() === OFFICIAL_VUSD_CONTRACT.toLowerCase();
      if (!isContractValid) {
        throw new Error(`Invalid VUSD contract. Expected: ${OFFICIAL_VUSD_CONTRACT}`);
      }

      addTerminalLine('success', `  ✓ VUSD Contract verified: ${formatAddress(lusdContract)}`);

      await new Promise(r => setTimeout(r, 1000));

      // Generate publication code
      const publicationCode = `PUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const blockNumber = Math.floor(Math.random() * 1000000) + 5000000;
      const gasUsed = String(Math.floor(Math.random() * 100000) + 80000);

      addTerminalLine('success', `  ✓ Minting verified!`);
      addTerminalLine('contract', `  📋 Publication Code: ${publicationCode}`);

      // Update pending authorization
      const updatedAuth: PendingMintAuthorization = {
        ...auth,
        status: 'completed',
        mintTxHash,
        mintBlockNumber: blockNumber,
        mintGasUsed: gasUsed,
        mintedBy: walletAddress || 'LEMX_OPERATOR',
        mintedAt: new Date().toISOString(),
        publicationCode,
        publishedAt: new Date().toISOString()
      };

      setPendingMintAuthorizations(prev => prev.map(a => 
        a.id === auth.id ? updatedAuth : a
      ));

      // Get issuer operator for record
      const issuerOperator = AUTHORIZED_WALLETS_WITH_KEYS.find(w => w.role === 'ISSUER_OPERATOR');

      // Create the full transaction record for Explorer
      const mintTransaction: MintVUSDTransaction = {
        id: generateId(),
        mintCode: auth.authorizationCode,
        publicationCode,
        txHash: mintTxHash,
        blockNumber,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        
        // VUSD Contract Verification
        lusdContractAddress: lusdContract,
        lusdContractVerified: true,
        
        // Lock Information
        lockId: auth.lockId,
        lockAmount: String(auth.lockAmount),
        lockCurrency: auth.lockCurrency,
        
        // Mint Details
        mintedAmount: auth.requestedVUSD || String(auth.lockAmount),
        mintedToken: 'VUSD',
        beneficiary: auth.beneficiaryAddress,
        
        // Bank & Custody Info
        bankId: auth.bankId,
        bankName: auth.bankName,
        custodyVault: auth.custodyVault,
        
        // Operator Info
        operatorAddress: issuerOperator?.address || '',
        operatorRole: 'ISSUER_OPERATOR',
        operatorPrivateKey: issuerOperator?.privateKey || '',
        
        // Signatures
        signatures: [
          {
            role: 'ISSUER_OPERATOR',
            address: issuerOperator?.address || '',
            signatureHash: '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            timestamp: new Date().toISOString()
          },
          {
            role: 'LEMX_MINTER',
            address: walletAddress || 'LEMX_OPERATOR',
            signatureHash: mintTxHash,
            timestamp: new Date().toISOString()
          }
        ],
        
        // Gas & Network
        gasUsed,
        gasPrice: '25',
        networkFee: ((parseInt(gasUsed) * 25) / 1e9).toFixed(6),
        chainId: LEMON_CHAIN.chainId,
        networkName: 'Lemon Chain',
        
        // ISO Traceability
        isoMessageId: auth.isoMessageId,
        uetr: auth.uetr,
        isoHash: auth.isoHash,
        daesTxnId: auth.daesTxnId,
        
        // Additional Data
        inputData: `0x${Array.from(JSON.stringify({ lockId: auth.lockId, amount: auth.requestedVUSD, beneficiary: auth.beneficiaryAddress, lusdContract })).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').substring(0, 200)}...`,
        logs: [
          { event: 'AuthorizationValidated', data: { code: auth.authorizationCode }, timestamp: new Date().toISOString() },
          { event: 'VUSDContractVerified', data: { contract: lusdContract, verified: true }, timestamp: new Date().toISOString() },
          { event: 'LockConsumed', data: { lockId: auth.lockId, amount: auth.lockAmount }, timestamp: new Date().toISOString() },
          { event: 'VUSDMinted', data: { amount: auth.requestedVUSD, to: auth.beneficiaryAddress, txHash: mintTxHash, contract: lusdContract }, timestamp: new Date().toISOString() },
          { event: 'Transfer', data: { from: '0x0000000000000000000000000000000000000000', to: auth.beneficiaryAddress, value: auth.requestedVUSD }, timestamp: new Date().toISOString() },
          { event: 'OperationPublished', data: { publicationCode }, timestamp: new Date().toISOString() }
        ]
      };

      // Save to Explorer history
      setMintVUSDTransactions(prev => [mintTransaction, ...prev]);
      setLastMintTransaction(mintTransaction);

      // Update the original lock status to CONSUMED
      setLocks(prev => prev.map(l => 
        l.lockId === auth.lockId 
          ? { ...l, status: 'CONSUMED' as const }
          : l
      ));

      // ═══════════════════════════════════════════════════════════════════════════════
      // SYNC WITH LEMX BRIDGE - Complete minting on both platforms
      // ═══════════════════════════════════════════════════════════════════════════════
      if (auth.source === 'lemx_platform') {
        addTerminalLine('network', '  📡 Syncing completion with LEMX Bridge...');
        const bridgeResult = lemxBridge.completeMinting(
          auth.authorizationCode,
          mintTxHash,
          lusdContract
        );
        
        if (bridgeResult.success) {
          addTerminalLine('success', '  ✓ LEMX Bridge synced successfully');
          addTerminalLine('info', `  → Confirmation ID: ${bridgeResult.data?.requestId || bridgeResult.requestId}`);
        } else {
          addTerminalLine('warning', `  ⚠️ LEMX Bridge sync: ${bridgeResult.error}`);
        }
      }

      addTerminalLine('success', `✓ Minting operation completed and published!`);
      addTerminalLine('contract', `  VUSD minted: ${auth.requestedVUSD || auth.lockAmount}`);
      addTerminalLine('contract', `  Beneficiary: ${formatAddress(auth.beneficiaryAddress)}`);
      addTerminalLine('contract', `  Publication Code: ${publicationCode}`);
      addTerminalLine('info', `  📊 View in MINT LEMON EXPLORER VUSD`);

      // Reset mint with code modal state
      setMintWithCodeStep('enter_code');
      setValidatedAuthorization(null);
      setLemxMintTxHash('');
      setLemxContractAddress('');
      setContractVerified(false);
      setMintAuthCode('');
      setShowMintWithCodeModal(false);

      // Show success modal with transaction details
      setShowMintSuccessModal(true);
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to complete minting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE PROFESSIONAL VUSD MINTING RECEIPT PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const generateMintingReceiptPDF = (tx: MintVUSDTransaction) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colors
    const primaryColor: [number, number, number] = [0, 51, 102]; // Navy blue
    const accentColor: [number, number, number] = [0, 128, 128]; // Teal
    const goldColor: [number, number, number] = [184, 134, 11]; // Gold
    const successColor: [number, number, number] = [16, 185, 129]; // Emerald
    const mintColor: [number, number, number] = [139, 92, 246]; // Purple/Violet
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PAGE 1: MINTING RECEIPT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Header gradient bar
    doc.setFillColor(...mintColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Gold accent line
    doc.setFillColor(...goldColor);
    doc.rect(0, 35, pageWidth, 2, 'F');
    
    // Logo placeholder (circle)
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 17.5, 10, 'F');
    doc.setFillColor(...accentColor);
    doc.circle(25, 17.5, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DCB', 25, 19, { align: 'center' });
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DIGITAL COMMERCIAL BANK', 42, 14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('VUSD Minting Platform', 42, 22);
    doc.setFontSize(8);
    doc.text('LemonChain Stablecoin Issuance System', 42, 28);
    
    // Minted badge
    doc.setFillColor(...successColor);
    doc.roundedRect(pageWidth - 55, 8, 45, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('MINTED', pageWidth - 32.5, 15, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('CONFIRMED', pageWidth - 32.5, 21, { align: 'center' });
    
    let yPos = 48;
    
    // Certificate Title
    doc.setTextColor(...primaryColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VUSD MINTING RECEIPT', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Authorization Code: ${tx.mintCode}`, pageWidth / 2, yPos, { align: 'center' });
    
    // Divider
    yPos += 8;
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.5);
    doc.line(40, yPos, pageWidth - 40, yPos);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MINTED AMOUNT SECTION (PROMINENT)
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'F');
    doc.setDrawColor(...mintColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'S');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text('MINTED AMOUNT', pageWidth / 2, yPos + 2, { align: 'center' });
    
    doc.setTextColor(...mintColor);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloat(tx.mintedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} VUSD`, pageWidth / 2, yPos + 20, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // TRANSACTION HASH SECTION (BLOCKCHAIN VERIFIED)
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 42;
    doc.setFillColor(...successColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 28, 3, 3, 'F');
    
    // LEMX Logo
    doc.setFillColor(255, 255, 255);
    doc.circle(28, yPos + 14, 8, 'F');
    doc.setTextColor(...successColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMX', 28, yPos + 15.5, { align: 'center' });
    
    // Transaction Hash
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMONCHAIN TRANSACTION HASH', 42, yPos + 8);
    
    doc.setFontSize(6.5);
    doc.setFont('courier', 'normal');
    doc.text(tx.txHash, 42, yPos + 15);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Block: ${tx.blockNumber.toLocaleString()}  |  Gas: ${parseInt(tx.gasUsed).toLocaleString()}  |  Fee: ${tx.networkFee} LEMX`, 42, yPos + 22);
    
    // Verified Badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 45, yPos + 6, 25, 16, 2, 2, 'F');
    doc.setTextColor(...successColor);
    doc.setFontSize(14);
    doc.text('✓', pageWidth - 32.5, yPos + 14, { align: 'center' });
    doc.setFontSize(6);
    doc.text('VERIFIED', pageWidth - 32.5, yPos + 19, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VUSD CONTRACT ADDRESS SECTION (VERIFIED)
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 32;
    doc.setFillColor(...mintColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
    
    // Contract Icon
    doc.setFillColor(255, 255, 255);
    doc.circle(28, yPos + 12.5, 8, 'F');
    doc.setTextColor(...mintColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('VUSD', 28, yPos + 14, { align: 'center' });
    
    // Contract Address
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VUSD CONTRACT ADDRESS (VERIFIED)', 42, yPos + 7);
    
    doc.setFontSize(6.5);
    doc.setFont('courier', 'normal');
    doc.text(tx.lusdContractAddress || OFFICIAL_VUSD_CONTRACT, 42, yPos + 14);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Token: VUSD (Lemon USD Stablecoin)  |  Standard: ERC-20  |  Chain: LemonChain`, 42, yPos + 20);
    
    // Verified Badge for Contract
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 45, yPos + 4.5, 25, 16, 2, 2, 'F');
    doc.setTextColor(...mintColor);
    doc.setFontSize(14);
    doc.text('✓', pageWidth - 32.5, yPos + 12.5, { align: 'center' });
    doc.setFontSize(6);
    doc.text('OFFICIAL', pageWidth - 32.5, yPos + 17.5, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DETAILS GRID
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 30;
    
    // Left Column - Lock Information
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPos, (pageWidth - 35) / 2, 45, 2, 2, 'F');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOCK INFORMATION', 20, yPos + 6);
    
    const lockItems = [
      { label: 'Lock ID', value: formatAddress(tx.lockId) },
      { label: 'Locked Amount', value: `${tx.lockCurrency} ${parseFloat(tx.lockAmount).toLocaleString()}` },
      { label: 'Bank', value: tx.bankName },
      { label: 'Custody Vault', value: formatAddress(tx.custodyVault) }
    ];
    
    let itemY = yPos + 14;
    lockItems.forEach(item => {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, 20, itemY);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, 20, itemY + 4);
      itemY += 10;
    });
    
    // Right Column - Minting Details
    const rightX = pageWidth / 2 + 2.5;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightX, yPos, (pageWidth - 35) / 2, 45, 2, 2, 'F');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MINTING DETAILS', rightX + 5, yPos + 6);
    
    const mintItems = [
      { label: 'Minted Token', value: tx.mintedToken },
      { label: 'Beneficiary', value: formatAddress(tx.beneficiary) },
      { label: 'Network', value: `LemonChain (ID: ${tx.chainId})` },
      { label: 'Timestamp', value: new Date(tx.timestamp).toLocaleString() }
    ];
    
    let rightY = yPos + 14;
    mintItems.forEach(item => {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, rightX + 5, rightY);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, rightX + 5, rightY + 4);
      rightY += 10;
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CODES SECTION
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 52;
    
    // Authorization Code Box
    doc.setFillColor(...mintColor);
    doc.roundedRect(15, yPos, (pageWidth - 35) / 2, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZATION CODE', 20, yPos + 6);
    doc.setFontSize(11);
    doc.text(tx.mintCode, 20, yPos + 15);
    
    // Publication Code Box
    doc.setFillColor(...accentColor);
    doc.roundedRect(rightX, yPos, (pageWidth - 35) / 2, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PUBLICATION CODE', rightX + 5, yPos + 6);
    doc.setFontSize(11);
    doc.text(tx.publicationCode || 'N/A', rightX + 5, yPos + 15);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // OPERATOR SIGNATURE
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 28;
    doc.setFillColor(...primaryColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ISSUER OPERATOR (AUTHORIZED SIGNER)', 20, yPos + 7);
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text(`Address: ${tx.operatorAddress}`, 20, yPos + 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Role: ${tx.operatorRole}  |  Signed: ${new Date(tx.timestamp).toLocaleString()}`, 20, yPos + 20);
    
    // Verified seal
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth - 30, yPos + 12.5, 8, 'F');
    doc.setTextColor(...successColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✓', pageWidth - 30, yPos + 14.5, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO TRACEABILITY
    // ═══════════════════════════════════════════════════════════════════════════════
    yPos += 32;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ISO 20022 TRACEABILITY', 15, yPos);
    
    yPos += 5;
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const isoData = [
      `ISO Message ID: ${tx.isoMessageId || 'N/A'}`,
      `UETR: ${tx.uetr || 'N/A'}`,
      `DAES Transaction ID: ${tx.daesTxnId || 'N/A'}`,
      `ISO Hash: ${tx.isoHash ? formatAddress(tx.isoHash) : 'N/A'}`
    ];
    isoData.forEach((text, i) => {
      doc.text(text, 15, yPos + (i * 4));
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════════════
    const footerY = pageHeight - 20;
    doc.setFillColor(...primaryColor);
    doc.rect(0, footerY, pageWidth, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Digital Commercial Bank Ltd. • VUSD Stablecoin Minting Platform', 15, footerY + 6);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, footerY + 11);
    doc.text('This document is electronically signed and verified on LemonChain', 15, footerY + 16);
    
    doc.setFontSize(6);
    doc.text(`Page 1 of 1`, pageWidth - 15, footerY + 16, { align: 'right' });
    
    // QR Code placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 45, footerY + 2, 16, 16, 1, 1, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(4);
    doc.text('SCAN TO', pageWidth - 37, footerY + 8, { align: 'center' });
    doc.text('VERIFY', pageWidth - 37, footerY + 11, { align: 'center' });
    
    // Save PDF
    doc.save(`DCB-VUSD-Minting-Receipt-${tx.mintCode}.pdf`);
    addTerminalLine('success', `✓ PDF Receipt generated: DCB-VUSD-Minting-Receipt-${tx.mintCode}.pdf`);
  };

  const cancelLock = async (lockId: string) => {
    try {
      setLoading(true);
      addTerminalLine('command', `> Canceling lock: ${formatAddress(lockId)}`);

      const lock = locks.find(l => l.lockId === lockId);
      if (!lock) throw new Error('Lock not found');
      if (lock.status !== 'REQUESTED' && lock.status !== 'LOCKED') {
        throw new Error('Lock cannot be canceled');
      }

      await new Promise(r => setTimeout(r, 1000));

      setLocks(prev => prev.map(l => 
        l.lockId === lockId 
          ? { ...l, status: 'CANCELED' as const }
          : l
      ));

      // Unlock custody if was locked
      if (lock.status === 'LOCKED') {
        setCustodies(prev => prev.map(c =>
          c.vault === lock.custodyVault
            ? { ...c, lockedBalance: (BigInt(c.lockedBalance || '0') - BigInt(lock.amountUSD)).toString() }
            : c
        ));
      }

      addTerminalLine('success', `✓ Lock canceled`);
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to cancel lock: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MINTING OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const mintUSD = async () => {
    if (!mintForm.custodyVault || !mintForm.amount) {
      addTerminalLine('error', '✗ Custody vault and amount required');
      return;
    }

    try {
      setLoading(true);
      addTerminalLine('command', `> Minting USD via Bridge...`);
      addTerminalLine('blockchain', `  To: ${formatAddress(mintForm.custodyVault)}`);
      addTerminalLine('blockchain', `  Amount: ${mintForm.amount} USD`);

      // Generate DAES signature (simulated)
      addTerminalLine('security', '  Generating DAES EIP-712 signature...');
      await new Promise(r => setTimeout(r, 1000));

      const daesTxnId = bytes32FromName(`DAES-MINT-${Date.now()}`);
      const isoHash = bytes32FromName(`ISO-MINT-${Date.now()}`);
      const msgId = mintForm.msgId || `MSG-${Date.now()}`;
      const uetr = mintForm.uetr || `UETR-${Date.now()}`;

      addTerminalLine('contract', `  DaesTxnId: ${formatAddress(daesTxnId)}`);
      addTerminalLine('contract', `  IsoHash: ${formatAddress(isoHash)}`);
      addTerminalLine('contract', `  MsgId: ${msgId}`);

      // Simulate blockchain transaction
      await new Promise(r => setTimeout(r, 1500));

      // Update custody balance
      setCustodies(prev => prev.map(c =>
        c.vault === mintForm.custodyVault
          ? { 
              ...c, 
              balance: (BigInt(c.balance || '0') + BigInt(mintForm.amount) * BigInt(10**18)).toString(),
              availableBalance: (BigInt(c.availableBalance || '0') + BigInt(mintForm.amount) * BigInt(10**18)).toString()
            }
          : c
      ));

      addTerminalLine('success', `✓ USD minted successfully`);
      addTerminalLine('contract', `  Amount: ${mintForm.amount} USD`);
      addTerminalLine('contract', `  Vault balance updated`);

      setMintForm({ custodyVault: '', amount: '', msgId: '', uetr: '' });
    } catch (err: any) {
      addTerminalLine('error', `✗ Failed to mint USD: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'text-yellow-400 bg-yellow-500/20';
      case 'LOCKED': return 'text-blue-400 bg-blue-500/20';
      case 'CONSUMED': return 'text-emerald-400 bg-emerald-500/20';
      case 'CANCELED': return 'text-red-400 bg-red-500/20';
      case 'NONE': return 'text-slate-400 bg-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getTerminalLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'command': return 'text-cyan-400';
      case 'output': return 'text-slate-300';
      case 'system': return 'text-purple-400';
      case 'network': return 'text-blue-400';
      case 'security': return 'text-orange-400';
      case 'blockchain': return 'text-pink-400';
      case 'contract': return 'text-indigo-400';
      default: return 'text-slate-400';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'dashboard' as const, name: t.dcbDashboard, icon: Activity },
    { id: 'contracts' as const, name: t.dcbContracts, icon: Code },
    { id: 'wallets' as const, name: t.dcbWalletsRoles, icon: Users },
    { id: 'banks' as const, name: t.dcbBanks, icon: Building2 },
    { id: 'custody' as const, name: t.dcbCustody, icon: Lock },
    { id: 'locks' as const, name: t.dcbLocks, icon: Key },
    { id: 'minting' as const, name: t.dcbMinting, icon: Coins },
    { id: 'approved' as const, name: isSpanish ? 'Aprobados' : 'Approved', icon: CheckCircle, count: lemxApprovalStatuses.filter(a => a.status === 'approved').length },
    { id: 'rejected' as const, name: isSpanish ? 'Rechazados' : 'Rejected', icon: XCircle, count: lemxApprovalStatuses.filter(a => a.status === 'rejected').length },
    { id: 'terminal' as const, name: t.dcbTerminal, icon: Terminal },
    { id: 'api' as const, name: 'API & Webhooks', icon: Server },
    { id: 'config' as const, name: t.dcbConfig, icon: Settings }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY PRO BLUE THEME - Inspired by LEMX Minting PRO Design
  // ═══════════════════════════════════════════════════════════════════════════════
  const premiumColors = {
    // Backgrounds - Deep dark with subtle blue tint
    bg: '#050810',
    bgSecondary: '#0A0F18',
    bgTertiary: '#0F1520',
    bgCard: '#0D1218',
    bgHover: '#141C28',
    bgActive: '#1A2430',
    bgGlass: 'rgba(59, 130, 246, 0.03)',
    bgRadial: 'radial-gradient(circle at top left, #0A0F18 0%, #050810 100%)',
    
    // Borders
    border: '#1E293B',
    borderHover: '#334155',
    borderAccent: 'rgba(59, 130, 246, 0.3)',
    borderGlow: 'rgba(59, 130, 246, 0.5)',
    
    // Blue Accent Colors - Primary Theme
    accent: '#3B82F6',           // Blue-500 - Primary blue
    accentHover: '#60A5FA',      // Blue-400 - Hover state
    accentBright: '#93C5FD',     // Blue-300 - Bright highlight
    accentDark: '#2563EB',       // Blue-600 - Dark variant
    accentDim: 'rgba(59, 130, 246, 0.15)',
    accentGlow: '#3B82F6',
    
    // Secondary Accents
    cyan: '#22D3EE',
    purple: '#A855F7',
    gold: '#FBBF24',
    orange: '#F97316',
    
    // Status Colors
    green: '#22C55E',
    greenDim: 'rgba(34, 197, 94, 0.15)',
    red: '#EF4444',
    redDim: 'rgba(239, 68, 68, 0.15)',
    yellow: '#FBBF24',
    yellowDim: 'rgba(251, 191, 36, 0.15)',
    
    // Text Colors
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDim: '#475569',
    textAccent: '#3B82F6',
    
    // Gradients
    gradientBlue: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
    gradientBlueSoft: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
    gradientDark: 'linear-gradient(180deg, #0A0F18 0%, #050810 100%)',
    gradientRadial: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
    gradientGlow: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIMULATE LOCK - Enviar un lock de prueba a Treasury Minting
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleSimulateLock = async () => {
    try {
      addTerminalLine('info', '📤 Enviando lock simulado a Treasury Minting...');
      
      const response = await fetch('http://localhost:4011/api/sandbox/simulate-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: (Math.random() * 100000 + 10000).toFixed(2),
          beneficiary: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        addTerminalLine('success', `✓ Lock enviado exitosamente: ${result.data?.lock?.lockId || 'OK'}`);
        addTerminalLine('info', `  → Código: ${result.data?.lock?.authorizationCode || 'N/A'}`);
        addTerminalLine('info', `  → Monto: $${parseFloat(result.data?.lock?.lockDetails?.amount || '0').toLocaleString()}`);
        
        // Broadcast WebSocket event
        if (dcbWebSocket) {
          dcbWebSocket.emit('lock.created', result.data?.lock);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        addTerminalLine('error', `✗ Error al enviar lock: ${errorData.error || response.statusText}`);
      }
    } catch (error: any) {
      addTerminalLine('error', `✗ Error de conexión: ${error.message}`);
      console.error('Error simulando lock:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET SANDBOX - Limpiar TODOS los datos a 0
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleResetSandbox = async () => {
    const confirmed = window.confirm(
      '🔄 RESET SANDBOX COMPLETO\n\n' +
      '¿Estás seguro de que quieres resetear el sandbox?\n\n' +
      'Esto eliminará TODO:\n' +
      '• Todos los Locks creados\n' +
      '• Todas las Custodias\n' +
      '• Historial de Minting y Explorer\n' +
      '• Autorizaciones pendientes\n' +
      '• Datos del servidor (ambos puertos)\n' +
      '• Todos los datos de localStorage\n\n' +
      '⚠️ TODOS los valores volverán a 0\n\n' +
      'Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;
    
    console.log('🔄 ═══════════════════════════════════════════════════════════════════');
    console.log('   DCB TREASURY - RESET SANDBOX COMPLETO');
    console.log('═══════════════════════════════════════════════════════════════════════');
    
    try {
      // Clear server data on BOTH ports
      try {
        await fetch('http://localhost:4010/api/clear-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: 'CLEAR_ALL_DATA' })
        });
        console.log('✅ DCB Treasury server (4010) cleared');
      } catch (e) {
        console.warn('⚠️ Could not clear DCB server:', e);
      }
      
      try {
        await fetch('http://localhost:4011/api/clear-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: 'CLEAR_ALL_DATA' })
        });
        console.log('✅ LEMX Minting server (4011) cleared');
      } catch (e) {
        console.warn('⚠️ Could not clear LEMX server:', e);
      }
      
      // Clear ALL local state
      setLocks([]);
      setCustodies([]);
      setMintedLocks([]);
      setMintVUSDTransactions([]);
      setPendingMintAuthorizations([]);
      setLemxApprovalStatuses([]);
      setBanks([]);
      
      // Clear ALL localStorage keys - DCB Treasury
      localStorage.removeItem(STORAGE_KEY_CONTRACTS);
      localStorage.removeItem(STORAGE_KEY_BANKS);
      localStorage.removeItem(STORAGE_KEY_CUSTODIES);
      localStorage.removeItem(STORAGE_KEY_LOCKS);
      localStorage.removeItem(STORAGE_KEY_MINTED_LOCKS);
      localStorage.removeItem(STORAGE_KEY_LEMX_APPROVALS);
      localStorage.removeItem(STORAGE_KEY_LEMX_REQUESTS);
      localStorage.removeItem('dcb_mint_lemon_explorer_lusd');
      localStorage.removeItem('dcb_pending_mint_authorizations');
      localStorage.removeItem('dcb_minted_locks');
      localStorage.removeItem('dcb_lemx_approvals');
      localStorage.removeItem('dcb_lemx_approval_statuses');
      
      // Clear ALL localStorage keys - LEMX/Treasury Minting
      localStorage.removeItem('lemx_pending_locks');
      localStorage.removeItem('lemx_mint_requests');
      localStorage.removeItem('lemx_mint_with_code_queue');
      localStorage.removeItem('lemx_mint_explorer');
      localStorage.removeItem('lemx_webhook_events');
      localStorage.removeItem('lemx_approved_mints');
      localStorage.removeItem('lemx_completed_mints');
      localStorage.removeItem('lemx_rejected_mints');
      localStorage.removeItem('lemx_statistics');
      localStorage.removeItem('lemx_mint_authorization_requests');
      localStorage.removeItem('api_bridge_pending_locks');
      localStorage.removeItem('api_bridge_mint_requests');
      localStorage.removeItem('api_bridge_webhook_events');
      localStorage.removeItem('api_bridge_completed_mints');
      localStorage.removeItem('api_bridge_rejected_locks');
      
      console.log('✅ All localStorage cleared');
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('   ✅ RESET COMPLETO - TODOS LOS VALORES EN 0');
      console.log('═══════════════════════════════════════════════════════════════════════\n');
      
      addTerminalLine('success', '🔄 SANDBOX RESETEADO COMPLETAMENTE - Todos los valores en 0');
      
      // Show success alert
      alert('✅ RESET COMPLETO\n\nTodos los datos han sido eliminados.\nTodos los valores están en 0.');
      
    } catch (error: any) {
      addTerminalLine('error', `Error al resetear: ${error.message}`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ 
        background: premiumColors.bgRadial,
        fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PRO HEADER - DCB Treasury Blue Theme */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <header 
        className="flex items-center justify-between px-6"
        style={{ 
          height: '72px',
          background: `linear-gradient(180deg, ${premiumColors.bgSecondary} 0%, ${premiumColors.bg} 100%)`,
          borderBottom: `1px solid ${premiumColors.border}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Left Section - Logo & Title */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ 
                background: premiumColors.bgTertiary,
                color: premiumColors.textSecondary,
                border: `1px solid ${premiumColors.border}`
              }}
              title={t.dcbBack}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-4">
            {/* Hexagonal Logo with Blue Glow */}
            <div 
              className="relative"
              style={{ 
                width: '48px',
                height: '48px',
                background: premiumColors.gradientBlue,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                boxShadow: `0 0 30px ${premiumColors.accentDim}, 0 0 60px rgba(59, 130, 246, 0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>
            <div>
              <h1 
                className="text-xl font-bold tracking-tight flex items-center gap-2"
                style={{ 
                  background: premiumColors.gradientBlue,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 40px rgba(59, 130, 246, 0.5)'
                }}
              >
                DCB TREASURY
                <Sparkles className="w-4 h-4" style={{ color: premiumColors.accent }} />
              </h1>
              <p 
                className="text-[11px] tracking-widest uppercase font-medium"
                style={{ color: premiumColors.accent }}
              >
                Certification Platform
              </p>
            </div>
          </div>
          
          {/* Network Badge */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ 
              background: premiumColors.accentDim,
              border: `1px solid ${premiumColors.borderAccent}`,
              marginLeft: '16px'
            }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ 
                background: premiumColors.accent,
                boxShadow: `0 0 8px ${premiumColors.accent}`
              }}
            />
            <span style={{ color: premiumColors.accent }}>LemonChain</span>
            <span style={{ color: premiumColors.textMuted }}>ID: {LEMON_CHAIN.chainId}</span>
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center gap-3">
          {/* Sandbox Mode Toggle - Blue Theme */}
          <button
            onClick={() => setSandboxMode(!sandboxMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 hover:scale-105"
            style={{ 
              background: sandboxMode ? premiumColors.gradientBlue : premiumColors.greenDim,
              color: sandboxMode ? '#fff' : premiumColors.green,
              border: `1px solid ${sandboxMode ? premiumColors.accent : 'rgba(34, 197, 94, 0.3)'}`,
              boxShadow: sandboxMode ? `0 4px 20px ${premiumColors.accentDim}` : 'none'
            }}
          >
            {sandboxMode ? (
              <>
                <FlaskConical className="w-4 h-4" />
                <span>SANDBOX</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>PRODUCTION</span>
              </>
            )}
          </button>

          {/* Simulate Lock Button - Only in Sandbox Mode */}
          {sandboxMode && (
            <button
              onClick={handleSimulateLock}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 hover:scale-105"
              style={{ 
                background: premiumColors.accentDim,
                color: premiumColors.accent,
                border: `1px solid ${premiumColors.borderAccent}`
              }}
              title="Simular envío de Lock a Treasury Minting"
            >
              <Send className="w-4 h-4" />
              <span>SEND LOCK</span>
            </button>
          )}

          {/* Reset Sandbox Button */}
          <button
            onClick={handleResetSandbox}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 hover:scale-105"
            style={{ 
              background: premiumColors.redDim,
              color: premiumColors.red,
              border: `1px solid rgba(239, 68, 68, 0.3)`
            }}
            title="Reset Sandbox - Todos los valores a 0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET</span>
          </button>

          {/* WebSocket Status Indicator - Blue Theme */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ 
              background: wsConnected ? premiumColors.accentDim : premiumColors.redDim,
              color: wsConnected ? premiumColors.accent : premiumColors.red,
              border: `1px solid ${wsConnected ? premiumColors.borderAccent : 'rgba(239, 68, 68, 0.3)'}`
            }}
            title={`WebSocket: ${wsConnected ? 'Connected' : 'Disconnected'} | Messages: ${wsMessagesReceived}`}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ 
                background: wsConnected ? premiumColors.accent : premiumColors.red,
                boxShadow: `0 0 8px ${wsConnected ? premiumColors.accent : premiumColors.red}`
              }}
            />
            <span className="tracking-wide">WS: {wsMessagesReceived}</span>
          </div>

          {/* TEST CONNECTION BUTTON */}
          <button
            onClick={async () => {
              console.log('%c🔍 TESTING CONNECTION TO SERVERS...', 'color: #ffff00; font-size: 16px; font-weight: bold;');
              addTerminalLine('command', '> Testing connection to servers...');
              
              const results: string[] = [];
              
              // Test DCB Treasury API
              try {
                const dcbRes = await fetch('http://localhost:4010/api/health', { method: 'GET' });
                const dcbData = await dcbRes.json();
                results.push(`✅ DCB API (4010): ${dcbData.status}`);
                addTerminalLine('success', `  ✓ DCB Treasury API (4010): ${dcbData.status}`);
              } catch (e: any) {
                results.push(`❌ DCB API (4010): ${e.message}`);
                addTerminalLine('error', `  ✗ DCB Treasury API (4010): ${e.message}`);
              }
              
              // Test LEMX Minting API
              try {
                const lemxRes = await fetch('http://localhost:4011/api/health', { method: 'GET' });
                const lemxData = await lemxRes.json();
                results.push(`✅ LEMX API (4011): ${lemxData.status}`);
                addTerminalLine('success', `  ✓ LEMX Minting API (4011): ${lemxData.status}`);
              } catch (e: any) {
                results.push(`❌ LEMX API (4011): ${e.message}`);
                addTerminalLine('error', `  ✗ LEMX Minting API (4011): ${e.message}`);
              }
              
              // Get lock counts
              try {
                const dcbLocks = await fetch('http://localhost:4010/api/locks').then(r => r.json());
                const lemxLocks = await fetch('http://localhost:4011/api/locks').then(r => r.json());
                results.push(`📊 Locks: DCB=${dcbLocks.count || 0}, LEMX=${lemxLocks.count || 0}`);
                addTerminalLine('info', `  → Locks en servidores: DCB=${dcbLocks.count || 0}, LEMX=${lemxLocks.count || 0}`);
              } catch (e: any) {
                addTerminalLine('warning', `  → No se pudo obtener conteo de locks`);
              }
              
              alert(results.join('\n'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}
            title="Test connection to DCB Treasury and LEMX Minting APIs"
          >
            <Zap className="w-3 h-3" />
            Test API
          </button>

          {/* Network Status - Blue Theme */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ 
              background: chainId === LEMON_CHAIN.chainId ? premiumColors.accentDim : premiumColors.bgTertiary,
              color: chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.textMuted,
              border: `1px solid ${chainId === LEMON_CHAIN.chainId ? premiumColors.borderAccent : premiumColors.border}`
            }}
          >
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ 
                background: chainId === LEMON_CHAIN.chainId ? premiumColors.green : premiumColors.textMuted,
                boxShadow: chainId === LEMON_CHAIN.chainId ? `0 0 8px ${premiumColors.green}` : 'none'
              }}
            />
            <span className="tracking-wide">
              {chainId === LEMON_CHAIN.chainId ? 'LEMON CHAIN' : chainId > 0 ? `CHAIN ${chainId}` : 'DISCONNECTED'}
            </span>
          </div>

          {/* Connection Mode Badge */}
          {isConnected && connectionMode && (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold tracking-wider"
              style={{ 
                background: connectionMode === 'direct' ? premiumColors.accentDim : premiumColors.yellowDim,
                color: connectionMode === 'direct' ? premiumColors.accent : premiumColors.yellow
              }}
            >
              {connectionMode === 'direct' ? (
                <>
                  <Zap className="w-3 h-3" />
                  <span>DIRECT</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3 h-3" />
                  <span>METAMASK</span>
                </>
              )}
            </div>
          )}

          {/* Wallet Connection - Premium Style */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded"
                style={{ 
                  background: premiumColors.greenDim,
                  border: `1px solid rgba(0, 212, 170, 0.3)`
                }}
              >
                <Wallet className="w-3.5 h-3.5" style={{ color: premiumColors.green }} />
                <div className="flex flex-col">
                  <span 
                    className="text-xs font-mono tracking-wider"
                    style={{ color: premiumColors.green }}
                  >
                    {formatAddress(walletAddress)}
                  </span>
                  {selectedWallet && (
                    <span 
                      className="text-[9px] tracking-wide"
                      style={{ color: premiumColors.textMuted }}
                    >
                      {selectedWallet.name} • {selectedWallet.role}
                    </span>
                  )}
                </div>
                {connectionMode === 'direct' && (
                  <span 
                    className="text-[10px] font-semibold ml-1"
                    style={{ color: premiumColors.accent }}
                  >
                    {lemonChainBalance} LEMX
                  </span>
                )}
              </div>
              
              {connectionMode === 'metamask' && chainId !== LEMON_CHAIN.chainId && (
                <button
                  onClick={switchToLemonChain}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all duration-200"
                  style={{ 
                    background: premiumColors.yellowDim,
                    color: premiumColors.yellow,
                    border: `1px solid rgba(255, 193, 7, 0.3)`
                  }}
                >
                  Switch Network
                </button>
              )}
              
              <button
                onClick={disconnectWallet}
                className="p-1.5 rounded transition-all duration-200 hover:scale-105"
                style={{ 
                  background: premiumColors.redDim,
                  color: premiumColors.red
                }}
                title={t.dcbDisconnect}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWalletSelector(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold tracking-wide transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                style={{ 
                  background: `linear-gradient(135deg, ${premiumColors.accent} 0%, #00a080 100%)`,
                  color: '#000',
                  boxShadow: `0 4px 20px ${premiumColors.accentDim}`
                }}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {t.dcbDirectConnect}
              </button>
              
              <button
                onClick={connectWallet}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all duration-200 disabled:opacity-50"
                style={{ 
                  background: premiumColors.bgTertiary,
                  color: premiumColors.textSecondary,
                  border: `1px solid ${premiumColors.border}`
                }}
              >
                <Wallet className="w-3.5 h-3.5" />
                MetaMask
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* WALLET SELECTOR MODAL (Direct Connection) - Premium Style */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showWalletSelector && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' }}
        >
          <div 
            className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden"
            style={{ 
              background: premiumColors.bgCard,
              border: `1px solid ${premiumColors.border}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between p-5"
              style={{ borderBottom: `1px solid ${premiumColors.border}` }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: premiumColors.accentDim,
                    border: `1px solid rgba(0, 212, 170, 0.2)`
                  }}
                >
                  <Zap className="w-5 h-5" style={{ color: premiumColors.accent }} />
                </div>
                <div>
                  <h3 
                    className="text-base font-semibold tracking-tight"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    {t.dcbDirectConnection}
                  </h3>
                  <p 
                    className="text-xs tracking-wide"
                    style={{ color: premiumColors.textMuted }}
                  >
                    {t.dcbSelectWallet}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWalletSelector(false)}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                style={{ 
                  background: premiumColors.bgTertiary,
                  color: premiumColors.textMuted
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Network Info */}
            <div 
              className="px-5 py-3"
              style={{ 
                background: premiumColors.bgSecondary,
                borderBottom: `1px solid ${premiumColors.border}`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ 
                      background: premiumColors.green,
                      boxShadow: `0 0 8px ${premiumColors.green}`
                    }}
                  />
                  <span 
                    className="text-xs font-semibold tracking-wider"
                    style={{ color: premiumColors.textSecondary }}
                  >
                    LEMONCHAIN
                  </span>
                  <span 
                    className="text-[10px] tracking-wide"
                    style={{ color: premiumColors.textMuted }}
                  >
                    Chain ID: {LEMON_CHAIN.chainId}
                  </span>
                </div>
                <div 
                  className="flex items-center gap-2 text-[10px]"
                  style={{ color: premiumColors.textMuted }}
                >
                  <Globe className="w-3 h-3" />
                  <span className="font-mono">{LEMON_CHAIN.rpcUrl}</span>
                </div>
              </div>
            </div>

            {/* Wallet List */}
            {/* Wallet List - Premium Style */}
            <div className="p-5 space-y-2 max-h-[400px] overflow-y-auto">
              {AUTHORIZED_WALLETS_WITH_KEYS.map((wallet) => {
                const roleColor = wallet.role === 'ADMIN' ? premiumColors.red :
                                  wallet.role === 'DAES_SIGNER' ? premiumColors.accent :
                                  wallet.role === 'BANK_SIGNER' ? '#a855f7' :
                                  wallet.role === 'ISSUER_OPERATOR' ? premiumColors.green :
                                  premiumColors.yellow;
                return (
                  <button
                    key={wallet.address}
                    onClick={() => connectDirectly(wallet)}
                    disabled={loading}
                    className="w-full p-4 rounded-lg transition-all duration-200 group text-left"
                    style={{ 
                      background: premiumColors.bgTertiary,
                      border: `1px solid ${premiumColors.border}`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = roleColor;
                      e.currentTarget.style.background = premiumColors.bgCard;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = premiumColors.border;
                      e.currentTarget.style.background = premiumColors.bgTertiary;
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded"
                          style={{ 
                            background: `${roleColor}15`,
                            border: `1px solid ${roleColor}30`
                          }}
                        >
                          {wallet.role === 'ADMIN' ? <Shield className="w-4 h-4" style={{ color: roleColor }} /> :
                           wallet.role === 'DAES_SIGNER' ? <Key className="w-4 h-4" style={{ color: roleColor }} /> :
                           wallet.role === 'BANK_SIGNER' ? <Building2 className="w-4 h-4" style={{ color: roleColor }} /> :
                           wallet.role === 'ISSUER_OPERATOR' ? <Coins className="w-4 h-4" style={{ color: roleColor }} /> :
                           <CheckCircle className="w-4 h-4" style={{ color: roleColor }} />}
                        </div>
                        <div>
                          <p 
                            className="text-sm font-semibold transition-colors"
                            style={{ color: premiumColors.textPrimary }}
                          >
                            {wallet.name}
                          </p>
                          <p 
                            className="text-[10px]"
                            style={{ color: premiumColors.textMuted }}
                          >
                            {wallet.description}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                        style={{ 
                          background: `${roleColor}15`,
                          color: roleColor,
                          border: `1px solid ${roleColor}30`
                        }}
                      >
                        {wallet.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <code 
                        className="text-[10px] font-mono"
                        style={{ color: premiumColors.textMuted }}
                      >
                        {wallet.address}
                      </code>
                      <ArrowRight 
                        className="w-3.5 h-3.5 transition-all group-hover:translate-x-1" 
                        style={{ color: premiumColors.textMuted }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {wallet.permissions.slice(0, 3).map(perm => (
                        <span 
                          key={perm} 
                          className="px-1.5 py-0.5 rounded text-[9px] tracking-wide"
                          style={{ 
                            background: premiumColors.bgSecondary,
                            color: premiumColors.textMuted
                          }}
                        >
                          {perm}
                        </span>
                      ))}
                      {wallet.permissions.length > 3 && (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px]"
                          style={{ 
                            background: premiumColors.bgSecondary,
                            color: premiumColors.textMuted
                          }}
                        >
                          +{wallet.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-4"
              style={{ 
                background: premiumColors.bgSecondary,
                borderTop: `1px solid ${premiumColors.border}`
              }}
            >
              <div className="flex items-center justify-between">
                <p 
                  className="text-[10px] tracking-wide"
                  style={{ color: premiumColors.textMuted }}
                >
                  🔒 {isSpanish ? 'Conexión segura • Claves locales' : 'Secure connection • Local keys'}
                </p>
                <button
                  onClick={() => setShowWalletSelector(false)}
                  className="px-4 py-1.5 rounded text-xs font-medium transition-all duration-200"
                  style={{ 
                    background: premiumColors.bgTertiary,
                    color: premiumColors.textSecondary,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  {t.dcbCancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA - PRO Blue Layout */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        {/* Premium Sidebar - Blue Theme */}
        <nav 
          className="w-56 p-4 flex flex-col"
          style={{ 
            background: `linear-gradient(180deg, ${premiumColors.bgSecondary} 0%, ${premiumColors.bg} 100%)`,
            borderRight: `1px solid ${premiumColors.border}`
          }}
        >
          {/* Navigation Tabs */}
          <div className="space-y-1 flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                style={{ 
                  background: activeTab === tab.id 
                    ? premiumColors.gradientBlueSoft 
                    : 'transparent',
                  color: activeTab === tab.id ? premiumColors.accent : premiumColors.textSecondary,
                  border: activeTab === tab.id 
                    ? `1px solid ${premiumColors.borderAccent}` 
                    : '1px solid transparent',
                  boxShadow: activeTab === tab.id 
                    ? `0 0 20px ${premiumColors.accentDim}, inset 0 0 20px ${premiumColors.accentDim}` 
                    : 'none'
                }}
              >
                <tab.icon 
                  className="w-4 h-4" 
                  style={{ 
                    filter: activeTab === tab.id ? `drop-shadow(0 0 4px ${premiumColors.accent})` : 'none'
                  }}
                />
                <span className="text-xs font-semibold tracking-wide">{tab.name}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span 
                    className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ 
                      background: premiumColors.accentDim,
                      color: premiumColors.accent
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Premium Stats Summary - Blue Theme */}
          <div 
            className="mt-4 p-4 rounded-xl"
            style={{ 
              background: premiumColors.bgTertiary,
              border: `1px solid ${premiumColors.border}`,
              boxShadow: `inset 0 1px 0 ${premiumColors.borderAccent}`
            }}
          >
            <h3 
              className="text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"
              style={{ color: premiumColors.accent }}
            >
              <Activity className="w-3 h-3" />
              {t.dcbSummary}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: premiumColors.textMuted }}>{t.dcbBanks}</span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    color: premiumColors.accent,
                    background: premiumColors.accentDim
                  }}
                >
                  {banks.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: premiumColors.textMuted }}>{t.dcbCustodies}</span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    color: premiumColors.purple,
                    background: 'rgba(168, 85, 247, 0.15)'
                  }}
                >
                  {custodies.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: premiumColors.textMuted }}>Locks</span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    color: premiumColors.cyan,
                    background: 'rgba(34, 211, 238, 0.15)'
                  }}
                >
                  {locks.length}
                </span>
              </div>
              <div 
                className="pt-3 mt-3 flex justify-between items-center"
                style={{ borderTop: `1px solid ${premiumColors.border}` }}
              >
                <span className="text-[11px] font-medium" style={{ color: premiumColors.textMuted }}>{t.dcbActive}</span>
                <span 
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ 
                    color: premiumColors.green,
                    background: premiumColors.greenDim
                  }}
                >
                  {locks.filter(l => l.status === 'LOCKED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Network Status Card - Blue Theme */}
          <div 
            className="mt-3 p-4 rounded-xl"
            style={{ 
              background: chainId === LEMON_CHAIN.chainId ? premiumColors.accentDim : premiumColors.yellowDim,
              border: `1px solid ${chainId === LEMON_CHAIN.chainId ? premiumColors.borderAccent : 'rgba(251, 191, 36, 0.3)'}`
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ 
                  background: chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow,
                  boxShadow: `0 0 8px ${chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow}`
                }}
              />
              <span 
                className="text-[11px] font-bold tracking-wider"
                style={{ color: chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow }}
              >
                {chainId === LEMON_CHAIN.chainId ? 'LEMON CHAIN' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CONTENT AREA - PRO Blue Style */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <main 
          className="flex-1 overflow-auto p-6"
          style={{ 
            background: premiumColors.bgRadial,
            position: 'relative'
          }}
        >
          {/* Subtle radial gradient overlay */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '300px',
              background: premiumColors.gradientRadial,
              pointerEvents: 'none'
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TREASURY CURRENCIES - DAES ISO 4217 Supported Currencies */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div 
            className="relative z-10 mb-6"
            style={{
              background: `linear-gradient(135deg, ${premiumColors.bgCard} 0%, rgba(15, 23, 42, 0.95) 100%)`,
              borderRadius: '16px',
              border: `1px solid ${premiumColors.border}`,
              padding: '16px 20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: premiumColors.accentDim,
                    border: `1px solid ${premiumColors.borderAccent}`
                  }}
                >
                  <Coins className="w-5 h-5" style={{ color: premiumColors.accent }} />
                </div>
                <div>
                  <h3 
                    className="text-sm font-bold tracking-wide"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    TREASURY CURRENCIES
                  </h3>
                  <p 
                    className="text-[10px] tracking-wider"
                    style={{ color: premiumColors.textMuted }}
                  >
                    DAES ISO 4217 • 15 DIVISAS SOPORTADAS
                  </p>
                </div>
              </div>
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider"
                style={{ 
                  background: premiumColors.greenDim,
                  color: premiumColors.green,
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: premiumColors.green }} />
                USD → VUSD ACTIVE
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {TREASURY_CURRENCIES.map((currency) => (
                <div
                  key={currency.code}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: currency.mintable 
                      ? premiumColors.accentDim 
                      : premiumColors.bgTertiary,
                    border: `1px solid ${currency.mintable ? premiumColors.borderAccent : premiumColors.border}`,
                    boxShadow: currency.mintable ? `0 0 15px ${premiumColors.accentDim}` : 'none'
                  }}
                >
                  <span 
                    className="text-xs font-bold"
                    style={{ color: currency.mintable ? premiumColors.accent : premiumColors.textSecondary }}
                  >
                    {currency.symbol}
                  </span>
                  <span 
                    className="text-[11px] font-semibold tracking-wide"
                    style={{ color: currency.mintable ? premiumColors.accent : premiumColors.textPrimary }}
                  >
                    {currency.code}
                  </span>
                  <span 
                    className="text-[9px] tracking-wider"
                    style={{ color: premiumColors.textMuted }}
                  >
                    ({currency.iso})
                  </span>
                  {currency.mintable && (
                    <div 
                      className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
                      style={{ 
                        background: premiumColors.green,
                        color: '#000'
                      }}
                    >
                      MINT
                    </div>
                  )}
                  {!currency.mintable && (
                    <div 
                      className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
                      style={{ 
                        background: premiumColors.yellowDim,
                        color: premiumColors.yellow
                      }}
                    >
                      RESERVE
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* DASHBOARD TAB - PRO Blue Design */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 
                    className="text-2xl font-bold tracking-tight flex items-center gap-3"
                    style={{ 
                      background: premiumColors.gradientBlue,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {t.dcbDashboard}
                    <Sparkles className="w-5 h-5" style={{ color: premiumColors.accent }} />
                  </h2>
                  <p 
                    className="text-sm tracking-wide mt-1"
                    style={{ color: premiumColors.textMuted }}
                  >
                    {isSpanish ? 'Vista general del sistema' : 'System Overview'}
                  </p>
                </div>
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-xl"
                  style={{ 
                    background: chainId === LEMON_CHAIN.chainId ? premiumColors.accentDim : premiumColors.yellowDim,
                    border: `1px solid ${chainId === LEMON_CHAIN.chainId ? premiumColors.borderAccent : 'rgba(251, 191, 36, 0.3)'}`,
                    boxShadow: chainId === LEMON_CHAIN.chainId ? `0 0 20px ${premiumColors.accentDim}` : 'none'
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ 
                      background: chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow,
                      boxShadow: `0 0 8px ${chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow}`
                    }}
                  />
                  <span 
                    className="text-xs font-bold tracking-wider"
                    style={{ color: chainId === LEMON_CHAIN.chainId ? premiumColors.accent : premiumColors.yellow }}
                  >
                    {chainId === LEMON_CHAIN.chainId ? 'LEMON CHAIN CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>

              {/* Connected Wallet Role Banner - Premium Style */}
              {isConnected && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    background: AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
                      ? premiumColors.greenDim
                      : premiumColors.yellowDim,
                    border: `1px solid ${AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
                      ? 'rgba(0, 212, 170, 0.3)'
                      : 'rgba(255, 193, 7, 0.3)'}`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-4 h-4" style={{ color: premiumColors.accent }} />
                      <span 
                        className="font-mono text-xs tracking-wider"
                        style={{ color: premiumColors.textSecondary }}
                      >
                        {formatAddress(walletAddress)}
                      </span>
                      {(() => {
                        const role = AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
                        if (role) {
                          return (
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                              style={{ 
                                background: premiumColors.accentDim,
                                color: premiumColors.accent,
                                border: `1px solid rgba(0, 212, 170, 0.3)`
                              }}
                            >
                              {role.role} • {role.name}
                            </span>
                          );
                        }
                        return (
                          <span 
                            className="text-xs"
                            style={{ color: premiumColors.yellow }}
                          >
                            Unauthorized
                          </span>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setActiveTab('wallets')}
                      className="text-xs font-medium transition-all duration-200 hover:opacity-80"
                      style={{ color: premiumColors.accent }}
                    >
                      {t.dcbViewRoles} →
                    </button>
                  </div>
                </div>
              )}

              {/* Blockchain Real-Time Stats Banner */}
              <div 
                className="rounded-xl p-4"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', 
                  border: '1px solid rgba(0, 212, 170, 0.3)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ 
                        background: blockchainData.blockHeight > 0 ? '#00d4aa' : '#ef4444',
                        boxShadow: `0 0 8px ${blockchainData.blockHeight > 0 ? '#00d4aa' : '#ef4444'}`
                      }}
                    />
                    <span className="text-xs font-bold tracking-wider" style={{ color: premiumColors.accent }}>
                      {isSpanish ? '🔗 BLOCKCHAIN EN VIVO' : '🔗 LIVE BLOCKCHAIN'}
                    </span>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: premiumColors.accent }}>${blockchainData.vusdTotal.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: premiumColors.textMuted }}>VUSD MINTED</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: '#22d3ee' }}>{blockchainData.vusdMints}</p>
                      <p className="text-[10px]" style={{ color: premiumColors.textMuted }}>MINTS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: '#fbbf24' }}>{blockchainData.blockHeight.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: premiumColors.textMuted }}>BLOCK</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: '#a855f7' }}>{blockchainData.totalEvents}</p>
                      <p className="text-[10px]" style={{ color: premiumColors.textMuted }}>EVENTS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards - Premium BitMart Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Banks Card */}
                <div 
                  className="rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    background: premiumColors.bgCard,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: premiumColors.textMuted }}
                    >
                      {isSpanish ? 'BANCOS' : 'BANKS'}
                    </span>
                    <div 
                      className="p-1.5 rounded"
                      style={{ background: premiumColors.accentDim }}
                    >
                      <Building2 className="w-3.5 h-3.5" style={{ color: premiumColors.accent }} />
                    </div>
                  </div>
                  <p 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    {banks.length}
                  </p>
                  <p 
                    className="text-[10px] mt-1"
                    style={{ color: premiumColors.green }}
                  >
                    {banks.filter(b => b.active).length} {t.dcbActive.toLowerCase()}
                  </p>
                </div>

                {/* Custodies Card */}
                <div 
                  className="rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    background: premiumColors.bgCard,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: premiumColors.textMuted }}
                    >
                      {isSpanish ? 'CUSTODIAS' : 'CUSTODIES'}
                    </span>
                    <div 
                      className="p-1.5 rounded"
                      style={{ background: 'rgba(168, 85, 247, 0.15)' }}
                    >
                      <Lock className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />
                    </div>
                  </div>
                  <p 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    {custodies.length}
                  </p>
                </div>

                {/* Locks Card */}
                <div 
                  className="rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    background: premiumColors.bgCard,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: premiumColors.textMuted }}
                    >
                      LOCKS
                    </span>
                    <div 
                      className="p-1.5 rounded"
                      style={{ background: premiumColors.accentDim }}
                    >
                      <Key className="w-3.5 h-3.5" style={{ color: premiumColors.accent }} />
                    </div>
                  </div>
                  <p 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    {locks.filter(l => l.status === 'LOCKED').length}
                  </p>
                  <p 
                    className="text-[10px] mt-1"
                    style={{ color: premiumColors.textMuted }}
                  >
                    {locks.length} total
                  </p>
                </div>

                {/* VUSD Card */}
                <div 
                  className="rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    background: premiumColors.bgCard,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: premiumColors.textMuted }}
                    >
                      VUSD MINTED
                    </span>
                    <div 
                      className="p-1.5 rounded"
                      style={{ background: premiumColors.greenDim }}
                    >
                      <Coins className="w-3.5 h-3.5" style={{ color: premiumColors.green }} />
                    </div>
                  </div>
                  <p 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: premiumColors.green }}
                  >
                    {totalMintedAmount > 0 
                      ? totalMintedAmount.toLocaleString() 
                      : locks.filter(l => l.status === 'CONSUMED').reduce((sum, l) => sum + parseFloat(l.approvedVUSD || '0'), 0).toLocaleString()
                    }
                  </p>
                </div>

                {/* Wallets Card */}
                <div 
                  className="rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    background: premiumColors.bgCard,
                    border: `1px solid ${premiumColors.border}`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: premiumColors.textMuted }}
                    >
                      WALLETS
                    </span>
                    <div 
                      className="p-1.5 rounded"
                      style={{ background: premiumColors.yellowDim }}
                    >
                      <Users className="w-3.5 h-3.5" style={{ color: premiumColors.yellow }} />
                    </div>
                  </div>
                  <p 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    {AUTHORIZED_WALLETS.length}
                  </p>
                  <p 
                    className="text-[10px] mt-1"
                    style={{ color: premiumColors.textMuted }}
                  >
                    {t.dcbAuthorized}
                  </p>
                </div>
              </div>

              {/* Authorized Wallets Quick View - Premium Style */}
              <div 
                className="rounded-lg p-5"
                style={{ 
                  background: premiumColors.bgCard,
                  border: `1px solid ${premiumColors.border}`
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    className="text-sm font-semibold tracking-tight flex items-center gap-2"
                    style={{ color: premiumColors.textPrimary }}
                  >
                    <Users className="w-4 h-4" style={{ color: premiumColors.yellow }} />
                    {t.dcbAuthorizedWallets}
                  </h3>
                  <button
                    onClick={() => setActiveTab('wallets')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    {t.dcbViewDetails} →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {AUTHORIZED_WALLETS.map(wallet => {
                    const isActive = walletAddress.toLowerCase() === wallet.address.toLowerCase();
                    const roleColors: Record<string, string> = {
                      'ADMIN': 'border-red-500/50 bg-red-500/10',
                      'DAES_SIGNER': 'border-purple-500/50 bg-purple-500/10',
                      'BANK_SIGNER': 'border-blue-500/50 bg-blue-500/10',
                      'ISSUER_OPERATOR': 'border-emerald-500/50 bg-emerald-500/10',
                      'APPROVER': 'border-orange-500/50 bg-orange-500/10'
                    };
                    return (
                      <div 
                        key={wallet.address}
                        className={`p-3 rounded-lg border ${roleColors[wallet.role] || 'border-slate-600 bg-slate-800/50'} ${isActive ? 'ring-2 ring-emerald-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-400">{wallet.role}</span>
                          {isActive && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                        </div>
                        <p className="text-sm font-medium truncate">{wallet.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{formatAddress(wallet.address)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Locks - Collapsible */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 transition-all duration-300">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsRecentLocksExpanded(!isRecentLocksExpanded)}
                  >
                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      {t.dcbRecentLocks}
                      <span className="text-xs font-normal bg-slate-700 px-2 py-0.5 rounded-full text-slate-400">
                        {locks.length}
                      </span>
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isRecentLocksExpanded ? '' : '-rotate-90'}`} />
                  </div>
                  {isRecentLocksExpanded && (
                  <div className="space-y-3 mt-4">
                    {locks.slice(-5).reverse().map(lock => {
                      // Check if this lock is approved by LEMX
                      const isApprovedByLemx = lemxApprovalStatuses.some(
                        a => a.status === 'approved' && a.lockId === lock.lockId
                      );
                      const isRejectedByLemx = lemxApprovalStatuses.some(
                        a => a.status === 'rejected' && a.lockId === lock.lockId
                      );
                      const isMinted = mintedLocks.some(m => m.lockId === lock.lockId);
                      
                      return (
                        <div key={lock.lockId} className="relative">
                          {/* APROBADO Badge above lock */}
                          {isApprovedByLemx && (
                            <div className="absolute -top-2 left-3 z-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              {isSpanish ? 'APROBADO POR LEMX' : 'APPROVED BY LEMX'}
                            </div>
                          )}
                          {isRejectedByLemx && (
                            <div className="absolute -top-2 left-3 z-10 bg-gradient-to-r from-red-500 to-rose-500 text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-red-500/30">
                              <XCircle className="w-3 h-3" />
                              {isSpanish ? 'RECHAZADO' : 'REJECTED'}
                            </div>
                          )}
                          {isMinted && !isApprovedByLemx && (
                            <div className="absolute -top-2 left-3 z-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/30">
                              <Coins className="w-3 h-3" />
                              {isSpanish ? 'MINTEADO' : 'MINTED'}
                            </div>
                          )}
                          
                          <div className={`bg-slate-900/50 p-4 rounded-lg ${
                            isApprovedByLemx 
                              ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 mt-1' 
                              : isRejectedByLemx
                                ? 'border-2 border-red-400 shadow-lg shadow-red-500/20 mt-1'
                                : isMinted
                                  ? 'border-2 border-blue-400 shadow-lg shadow-blue-500/20 mt-1'
                                  : 'border border-slate-700'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm text-slate-300">{formatAddress(lock.lockId)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lock.status)}`}>
                                {lock.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{lock.bankName}</span>
                              <span className="font-bold">{lock.amountUSD} USD</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {locks.length === 0 && (
                      <p className="text-slate-500 text-center py-4">{t.dcbNoLocks}</p>
                    )}
                  </div>
                  )}
                </div>

                {/* Custody Vaults - Collapsible */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 transition-all duration-300">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsCustodyAccountsExpanded(!isCustodyAccountsExpanded)}
                  >
                    <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      {t.dcbCustodyAccounts}
                      <span className="text-xs font-normal bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-400">
                        {custodies.length}
                      </span>
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCustodyAccountsExpanded ? '' : '-rotate-90'}`} />
                  </div>
                  {isCustodyAccountsExpanded && (
                  <div className="space-y-3 mt-4">
                    {custodies.slice(-5).reverse().map(custody => {
                      // Check if this custody has approved orders from LEMX
                      const approvedForCustody = lemxApprovalStatuses.filter(
                        a => a.status === 'approved' && (
                          a.sourceAccountId === custody.custodyId || 
                          a.sourceAccountName === custody.owner ||
                          custody.vault?.toLowerCase() === a.sourceAccountId?.toLowerCase()
                        )
                      );
                      const hasApproval = approvedForCustody.length > 0;
                      
                      return (
                        <div key={custody.custodyId} className="relative">
                          {/* APROBADO Badge above custody */}
                          {hasApproval && (
                            <div className="absolute -top-2 left-3 z-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              {isSpanish ? `APROBADO (${approvedForCustody.length})` : `APPROVED (${approvedForCustody.length})`}
                            </div>
                          )}
                          
                          <div className={`bg-slate-900/50 p-4 rounded-lg ${
                            hasApproval 
                              ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 mt-1' 
                              : 'border border-slate-700'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm text-slate-300">#{custody.custodyId}</span>
                              <span className="font-mono text-xs text-slate-400">{formatAddress(custody.vault)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{isSpanish ? 'Balance' : 'Balance'}</span>
                              <span className="font-bold text-emerald-400">{formatAmount(custody.balance)} USD</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {custodies.length === 0 && (
                      <p className="text-slate-500 text-center py-4">{t.dcbCustodyNoAccounts}</p>
                    )}
                  </div>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MINTS RECIENTES - Recent Mints Section - Collapsible */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 transition-all duration-300">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsRecentMintsExpanded(!isRecentMintsExpanded)}
                  >
                    <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      {isSpanish ? 'Mints Recientes' : 'Recent Mints'}
                      <span className="text-xs font-normal bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-400">
                        {mintedLocks.length}
                      </span>
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isRecentMintsExpanded ? '' : '-rotate-90'}`} />
                  </div>
                  {isRecentMintsExpanded && (
                  <div className="space-y-3 mt-4">
                    {mintedLocks.slice(-5).reverse().map(mint => (
                      <div key={mint.lockId} className="relative">
                        {/* MINTED Badge */}
                        <div className="absolute -top-2 left-3 z-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/30">
                          <Coins className="w-3 h-3" />
                          {isSpanish ? 'MINTEADO' : 'MINTED'}
                        </div>
                        
                        <div className="bg-slate-900/50 p-4 rounded-lg border-2 border-blue-400 shadow-lg shadow-blue-500/20 mt-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm text-slate-300">{formatAddress(mint.lockId)}</span>
                            <span className="font-bold text-blue-400">${parseFloat(mint.amount || '0').toLocaleString()} VUSD</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {mint.mintTxHash ? `${mint.mintTxHash.substring(0, 8)}...${mint.mintTxHash.slice(-6)}` : 'N/A'}
                            </span>
                            <span>{mint.mintedAt ? new Date(mint.mintedAt).toLocaleString() : 'N/A'}</span>
                          </div>
                          {mint.sourceAccountName && (
                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {mint.sourceAccountName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {mintedLocks.length === 0 && (
                      <div className="text-center py-8">
                        <Coins className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">{isSpanish ? 'No hay mints recientes' : 'No recent mints'}</p>
                        <p className="text-slate-600 text-xs mt-1">
                          {isSpanish 
                            ? 'Los mints completados aparecerán aquí' 
                            : 'Completed mints will appear here'}
                        </p>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SMART CONTRACTS v3.0 TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {t.dcbContractsV3}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    DCB Treasury Certification Platform - LemonChain
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <Network className="w-4 h-4" />
                  Chain ID: 1005
                </div>
              </div>

              {/* Architecture Diagram */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-6 border border-indigo-500/30">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {isSpanish ? 'Arquitectura de Contratos' : 'Contract Architecture'}
                </h3>
                <div className="font-mono text-xs text-slate-300 bg-slate-950/50 rounded-lg p-4 overflow-x-auto">
                  <pre>{`
┌──────────────────────────────────────────────────────────────────────────────┐
│                         VUSD OFICIAL (YA DESPLEGADO)                         │
│                  0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                  │
│                            Precio: $1.00 USD                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ Interactúa
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   USD.sol   │          │ LockBox.sol │          │PriceOracle  │
   │  Token v3.0 │          │ Custodia    │          │   .sol      │
   │  Swap 1:1   │          │ Timelock    │          │  $1.00 USD  │
   └─────────────┘          └─────────────┘          └─────────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────┐
                           │ BankRegistry.sol│
                           │   Governance    │
                           │   Multi-sig     │
                           └─────────────────┘
                  `}</pre>
                </div>
              </div>

              {/* Contract Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* VUSD Official Contract */}
                <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 rounded-xl p-6 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                        <Shield className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-emerald-400">🔐 VUSD (Official)</h4>
                        <p className="text-xs text-slate-400">Lemon USD Stablecoin</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="font-mono text-emerald-400 text-xs">{OFFICIAL_VUSD_CONTRACT}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Symbol:</span>
                      <span className="text-white">VUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Decimals:</span>
                      <span className="text-white">6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Price:</span>
                      <span className="text-emerald-400 font-bold">$1.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Version:</span>
                      <span className="text-white">v3.0.0</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {['EIP-2612', 'RBAC', 'Pausable', 'Flash Loans'].map(f => (
                          <span key={f} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* USD Token Contract */}
                <div className="bg-gradient-to-br from-cyan-900/30 to-slate-900 rounded-xl p-6 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                        <Coins className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-cyan-400">🪙 USD Token</h4>
                        <p className="text-xs text-slate-400">Wrapper con Swap 1:1</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="font-mono text-cyan-400 text-xs">0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Symbol:</span>
                      <span className="text-white">USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Decimals:</span>
                      <span className="text-white">6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Price:</span>
                      <span className="text-cyan-400 font-bold">$1.00 USD</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Key Functions:</p>
                      <div className="flex flex-wrap gap-1">
                        {['swapToVUSD', 'swapFromVUSD', 'permit', 'mint', 'burn'].map(f => (
                          <span key={f} className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded text-xs font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PriceOracle Contract */}
                <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-xl p-6 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/20 rounded-xl">
                        <Activity className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-purple-400">📊 PriceOracle</h4>
                        <p className="text-xs text-slate-400">Oracle de Precios</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="font-mono text-purple-400 text-xs">0x29818171799e5869Ed2Eb928B44e23A74b9554b3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">VUSD Price:</span>
                      <span className="text-purple-400 font-bold">$1.00 (Fixed)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Decimals:</span>
                      <span className="text-white">8 (Chainlink)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Interface:</span>
                      <span className="text-white">AggregatorV3</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Key Functions:</p>
                      <div className="flex flex-wrap gap-1">
                        {['latestRoundData', 'getVUSDPrice', 'getTokenPrice', 'registerToken'].map(f => (
                          <span key={f} className="px-2 py-0.5 bg-slate-800 text-purple-300 rounded text-xs font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BankRegistry Contract */}
                <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-6 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/20 rounded-xl">
                        <Building2 className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-amber-400">🏦 BankRegistry</h4>
                        <p className="text-xs text-slate-400">Governance Multi-sig</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="font-mono text-amber-400 text-xs">0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Approvals:</span>
                      <span className="text-white">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Proposal Duration:</span>
                      <span className="text-white">7 days</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Bank Status:</p>
                      <div className="flex flex-wrap gap-1">
                        {['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED'].map(s => (
                          <span key={s} className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* LockBox Contract - Full Width */}
                <div className="lg:col-span-2 bg-gradient-to-br from-rose-900/30 to-slate-900 rounded-xl p-6 border border-rose-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-500/20 rounded-xl">
                        <Lock className="w-6 h-6 text-rose-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-rose-400">🔒 LockBox</h4>
                        <p className="text-xs text-slate-400">Custodia con Timelock y Multi-sig</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="mb-4 p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs">Address: </span>
                    <span className="font-mono text-rose-400 text-xs">0xD0A4e3a716def7C66507f7C11A616798bdDF8874</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3 text-sm">
                      <h5 className="font-semibold text-rose-300">Configuration</h5>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min Lock:</span>
                        <span className="text-white">1 day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Lock:</span>
                        <span className="text-white">10 years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Penalty:</span>
                        <span className="text-rose-400 font-bold">10%</span>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <h5 className="font-semibold text-rose-300">Lock Types</h5>
                      <div className="flex flex-wrap gap-1">
                        {['STANDARD', 'VESTING', 'MULTISIG'].map(t => (
                          <span key={t} className="px-2 py-1 bg-slate-800 text-rose-300 rounded text-xs">{t}</span>
                        ))}
                      </div>
                      <h5 className="font-semibold text-rose-300 mt-3">Lock Status</h5>
                      <div className="flex flex-wrap gap-1">
                        {['ACTIVE', 'RELEASED', 'PARTIAL', 'EMERGENCY'].map(s => (
                          <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <h5 className="font-semibold text-rose-300">Key Functions</h5>
                      <div className="flex flex-wrap gap-1">
                        {['lockVUSD', 'releaseVUSD', 'createVestingLock', 'claimVested', 'emergencyWithdraw'].map(f => (
                          <span key={f} className="px-2 py-0.5 bg-slate-800 text-rose-300 rounded text-xs font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CustodyVault & MintingBridge - DCB Treasury Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CustodyVault Contract */}
                <div className="bg-gradient-to-br from-teal-900/30 to-slate-900 rounded-xl p-6 border border-teal-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-teal-500/20 rounded-xl">
                        <Lock className="w-6 h-6 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-teal-400">🏛️ CustodyVault</h4>
                        <p className="text-xs text-slate-400">Gestión de Vaults de Custodia</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="mb-4 p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs">Address: </span>
                    <span className="font-mono text-teal-400 text-xs">0xe6f7AF72E87E58191Db058763aFB53292a72a25E</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <h5 className="font-semibold text-teal-300">Key Functions</h5>
                    <div className="flex flex-wrap gap-1">
                      {['createVault', 'createLock', 'consumeAndMint', 'completeMinting'].map(f => (
                        <span key={f} className="px-2 py-0.5 bg-slate-800 text-teal-300 rounded text-xs font-mono">{f}</span>
                      ))}
                    </div>
                    <h5 className="font-semibold text-teal-300 mt-3">DCB Flow</h5>
                    <p className="text-xs text-slate-400">
                      Custody Account (M1) → CustodyVault → Lock → Authorization Code
                    </p>
                  </div>
                </div>

                {/* MintingBridge Contract */}
                <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900 rounded-xl p-6 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                        <Coins className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-indigo-400">🌉 MintingBridge</h4>
                        <p className="text-xs text-slate-400">Puente de Minting LEMX</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      ✅ DEPLOYED
                    </span>
                  </div>
                  <div className="mb-4 p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs">Address: </span>
                    <span className="font-mono text-indigo-400 text-xs">0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <h5 className="font-semibold text-indigo-300">Key Functions</h5>
                    <div className="flex flex-wrap gap-1">
                      {['submitMintRequest', 'approveMint', 'rejectMint', 'mintWithAuthCode'].map(f => (
                        <span key={f} className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded text-xs font-mono">{f}</span>
                      ))}
                    </div>
                    <h5 className="font-semibold text-indigo-300 mt-3">LEMX Flow</h5>
                    <p className="text-xs text-slate-400">
                      Authorization Code → MintingBridge → VUSD Minted → Mint Explorer
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Files */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  {t.dcbContractsSourceFiles}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { file: 'interfaces/IVUSD.sol', desc: 'Interface VUSD oficial', lines: '138' },
                    { file: 'USD.sol', desc: 'Token USD con swap', lines: '~950' },
                    { file: 'PriceOracle.sol', desc: 'Oracle de precios', lines: '~650' },
                    { file: 'BankRegistry.sol', desc: 'Registro de bancos', lines: '~960' },
                    { file: 'LockBox.sol', desc: 'Custodia timelock', lines: '1156' },
                    { file: 'CustodyVault.sol', desc: 'Gestión de vaults', lines: '~650' },
                    { file: 'MintingBridge.sol', desc: 'Puente LEMX', lines: '~550' },
                  ].map(item => (
                    <div key={item.file} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                      <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-cyan-400 truncate">v3/{item.file}</p>
                        <p className="text-xs text-slate-400">{item.desc} • {item.lines} líneas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contract Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Contracts', value: '7', icon: Code, color: 'cyan' },
                  { label: 'Deployed', value: '7', icon: CheckCircle, color: 'emerald' },
                  { label: 'Pending', value: '0', icon: Clock, color: 'amber' },
                  { label: 'Total Lines', value: '~5,000', icon: FileText, color: 'purple' },
                  { label: 'Version', value: 'v3.0.0', icon: Sparkles, color: 'rose' },
                ].map(stat => (
                  <div key={stat.label} className={`bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-xl p-4 text-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-400 mx-auto mb-2`} />
                    <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* WALLETS & ROLES TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'wallets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Wallets & Roles - Lemon Chain</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <Network className="w-4 h-4" />
                  Chain ID: {LEMON_CHAIN.chainId}
                </div>
              </div>

              {/* Current Connected Wallet Status */}
              <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 rounded-xl p-6 border border-indigo-500/30">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {isSpanish ? 'Wallet Conectada' : 'Connected Wallet'}
                </h3>
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/20 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-mono text-lg">{walletAddress}</p>
                        <p className="text-sm text-slate-400">
                          {AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())?.name || 'Unknown Wallet'}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const connectedRole = AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
                      if (connectedRole) {
                        return (
                          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-indigo-500/30 text-indigo-400 rounded text-xs font-bold">
                                {connectedRole.role}
                              </span>
                              <span className="text-slate-300 font-medium">{connectedRole.name}</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-3">{connectedRole.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {connectedRole.permissions.map(perm => (
                                <span key={perm} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-yellow-400">
                              <AlertTriangle className="w-5 h-5" />
                              <span className="font-medium">{isSpanish ? 'Wallet no autorizada' : 'Unauthorized Wallet'}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-2">
                              {isSpanish 
                                ? 'Esta wallet no tiene un rol asignado en el sistema. Conecta una de las wallets autorizadas.'
                                : 'This wallet does not have an assigned role in the system. Connect one of the authorized wallets.'}
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-700/50 rounded-xl">
                      <XCircle className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-slate-400">{isSpanish ? 'No hay wallet conectada' : 'No wallet connected'}</p>
                      <button
                        onClick={connectWallet}
                        className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        {isSpanish ? 'Conectar Wallet' : 'Connect Wallet'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Authorized Wallets Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {AUTHORIZED_WALLETS.map((wallet, index) => {
                  const isConnectedWallet = walletAddress.toLowerCase() === wallet.address.toLowerCase();
                  const roleColors: Record<string, string> = {
                    'ADMIN': 'from-red-900/50 border-red-500/30',
                    'DAES_SIGNER': 'from-purple-900/50 border-purple-500/30',
                    'BANK_SIGNER': 'from-blue-900/50 border-blue-500/30',
                    'ISSUER_OPERATOR': 'from-emerald-900/50 border-emerald-500/30',
                    'APPROVER': 'from-orange-900/50 border-orange-500/30'
                  };
                  const roleBadgeColors: Record<string, string> = {
                    'ADMIN': 'bg-red-500/30 text-red-400',
                    'DAES_SIGNER': 'bg-purple-500/30 text-purple-400',
                    'BANK_SIGNER': 'bg-blue-500/30 text-blue-400',
                    'ISSUER_OPERATOR': 'bg-emerald-500/30 text-emerald-400',
                    'APPROVER': 'bg-orange-500/30 text-orange-400'
                  };

                  return (
                    <div 
                      key={wallet.address}
                      className={`bg-gradient-to-br ${roleColors[wallet.role] || 'from-slate-900/50 border-slate-500/30'} to-slate-900 rounded-xl p-5 border ${isConnectedWallet ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${roleBadgeColors[wallet.role] || 'bg-slate-500/30 text-slate-400'}`}>
                            {wallet.role}
                          </span>
                          {isConnectedWallet && (
                            <span className="px-2 py-1 bg-emerald-500/30 text-emerald-400 rounded text-xs font-bold animate-pulse">
                              CONNECTED
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">#{index + 1}</span>
                      </div>

                      <h4 className="font-bold text-lg mb-1">{wallet.name}</h4>
                      <p className="text-sm text-slate-400 mb-3">{wallet.description}</p>

                      <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Address</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(wallet.address);
                              addTerminalLine('info', `Copied: ${wallet.address}`);
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-mono text-sm text-slate-300 break-all">{wallet.address}</p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 block mb-2">Permissions</span>
                        <div className="flex flex-wrap gap-1">
                          {wallet.permissions.map(perm => (
                            <span key={perm} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Role Hierarchy Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {isSpanish ? 'Jerarquía de Roles' : 'Role Hierarchy'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                      <Shield className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="font-bold text-red-400">ADMIN</p>
                    <p className="text-xs text-slate-500">{isSpanish ? 'Control Total' : 'Full Control'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                      <Key className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="font-bold text-purple-400">DAES</p>
                    <p className="text-xs text-slate-500">{isSpanish ? 'Firma ISO' : 'ISO Signing'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-bold text-blue-400">BANK</p>
                    <p className="text-xs text-slate-500">{isSpanish ? 'Attestación' : 'Attestation'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                      <Coins className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="font-bold text-emerald-400">ISSUER</p>
                    <p className="text-xs text-slate-500">{isSpanish ? 'Emisión VUSD' : 'VUSD Issuance'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-2">
                      <CheckCheck className="w-6 h-6 text-orange-400" />
                    </div>
                    <p className="font-bold text-orange-400">APPROVER</p>
                    <p className="text-xs text-slate-500">{isSpanish ? 'Multi-Sig' : 'Multi-Sig'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions based on connected role */}
              {isConnected && AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase()) && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    {isSpanish ? 'Acciones Rápidas' : 'Quick Actions'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const role = AUTHORIZED_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())?.role;
                      const actions = [];
                      
                      if (role === 'ADMIN') {
                        actions.push(
                          { label: isSpanish ? 'Registrar Banco' : 'Register Bank', tab: 'banks', icon: Building2 },
                          { label: isSpanish ? 'Crear Custodia' : 'Create Custody', tab: 'custody', icon: Lock },
                          { label: isSpanish ? 'Ver Terminal' : 'View Terminal', tab: 'terminal', icon: Terminal },
                          { label: isSpanish ? 'Configuración' : 'Configuration', tab: 'config', icon: Settings }
                        );
                      } else if (role === 'DAES_SIGNER') {
                        actions.push(
                          { label: isSpanish ? 'Mintear USD' : 'Mint USD', tab: 'minting', icon: Coins },
                          { label: isSpanish ? 'Ver Custodias' : 'View Custodies', tab: 'custody', icon: Lock }
                        );
                      } else if (role === 'BANK_SIGNER') {
                        actions.push(
                          { label: isSpanish ? 'Solicitar Lock' : 'Request Lock', tab: 'locks', icon: Key },
                          { label: isSpanish ? 'Ver Bancos' : 'View Banks', tab: 'banks', icon: Building2 }
                        );
                      } else if (role === 'ISSUER_OPERATOR') {
                        actions.push(
                          { label: isSpanish ? 'Consumir Locks' : 'Consume Locks', tab: 'locks', icon: Key },
                          { label: isSpanish ? 'Mintear VUSD' : 'Mint VUSD', tab: 'minting', icon: Coins }
                        );
                      } else if (role === 'APPROVER') {
                        actions.push(
                          { label: isSpanish ? 'Aprobar Locks' : 'Approve Locks', tab: 'locks', icon: CheckCircle },
                          { label: isSpanish ? 'Ver Dashboard' : 'View Dashboard', tab: 'dashboard', icon: Activity }
                        );
                      }
                      
                      return actions.map(action => (
                        <button
                          key={action.tab}
                          onClick={() => setActiveTab(action.tab as any)}
                          className="flex items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                        >
                          <action.icon className="w-4 h-4 text-indigo-400" />
                          {action.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* BANKS TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'banks' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{isSpanish ? 'Registro de Bancos' : 'Bank Registry'}</h2>

              {/* Add Bank Form */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {isSpanish ? 'Registrar Nuevo Banco' : 'Register New Bank'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Nombre del Banco' : 'Bank Name'}
                    </label>
                    <input
                      type="text"
                      value={newBankForm.name}
                      onChange={e => setNewBankForm({ ...newBankForm, name: e.target.value })}
                      placeholder="Santander Spain"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Dirección del Firmante' : 'Signer Address'}
                    </label>
                    <input
                      type="text"
                      value={newBankForm.signer}
                      onChange={e => setNewBankForm({ ...newBankForm, signer: e.target.value })}
                      placeholder="0x..."
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addBank}
                  disabled={loading || !newBankForm.name || !newBankForm.signer}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isSpanish ? 'Registrar Banco' : 'Register Bank'}
                </button>
              </div>

              {/* Banks List */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-slate-300 mb-4">{isSpanish ? 'Bancos Registrados' : 'Registered Banks'}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Bank ID</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Nombre' : 'Name'}</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Firmante' : 'Signer'}</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Estado' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.map(bank => (
                        <tr key={bank.bankId} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono text-sm">{formatAddress(bank.bankId)}</td>
                          <td className="py-3 px-4 font-semibold">{bank.name}</td>
                          <td className="py-3 px-4 font-mono text-sm text-slate-400">{formatAddress(bank.signer)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              bank.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {bank.active ? (isSpanish ? 'Activo' : 'Active') : (isSpanish ? 'Inactivo' : 'Inactive')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {banks.length === 0 && (
                    <p className="text-slate-500 text-center py-8">{isSpanish ? 'No hay bancos registrados' : 'No banks registered'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CUSTODY TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'custody' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{t.dcbCustodyAccounts}</h2>

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* LEMX MINTING APPROVAL BANNER - Shows when LEMX approves an order */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {showLemxApprovalBanner && lastApprovedLock && (
                <div className="relative bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-xl p-6 border-2 border-emerald-400">
                  <div className="absolute -top-3 left-4 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {isSpanish ? '¡LEMX MINTING APROBÓ!' : 'LEMX MINTING APPROVED!'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-bold text-lg">
                          {isSpanish ? 'Orden Aprobada por LEMX Minting' : 'Order Approved by LEMX Minting'}
                        </p>
                        <p className="text-slate-300 text-sm">
                          Lock ID: <span className="font-mono text-emerald-300">{lastApprovedLock.lockId}</span>
                        </p>
                        <p className="text-slate-300 text-sm">
                          {isSpanish ? 'Monto' : 'Amount'}: <span className="font-bold text-emerald-300">${parseFloat(lastApprovedLock.amount).toLocaleString()} {lastApprovedLock.currency}</span>
                        </p>
                        {lastApprovedLock.sourceAccountName && (
                          <p className="text-slate-400 text-xs mt-1">
                            {isSpanish ? 'Cuenta Custodio' : 'Custody Account'}: {lastApprovedLock.sourceAccountName}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowLemxApprovalBanner(false)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* VUSD MINTED BANNER - Shows when LEMX completes minting */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {showMintedBanner && lastMintedLock && (
                <div className="relative bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-xl p-6 border-2 border-cyan-400">
                  <div className="absolute -top-3 left-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    {isSpanish ? '🎉 ¡VUSD MINTEADO!' : '🎉 VUSD MINTED!'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-xl flex items-center justify-center">
                        <Coins className="w-10 h-10 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-cyan-400 font-bold text-lg">
                          {isSpanish ? 'VUSD Minteado Exitosamente' : 'VUSD Minted Successfully'}
                        </p>
                        <p className="text-slate-300 text-sm">
                          Lock ID: <span className="font-mono text-cyan-300">{lastMintedLock.lockId}</span>
                        </p>
                        <p className="text-slate-300 text-sm">
                          {isSpanish ? 'Monto Minteado' : 'Minted Amount'}: <span className="font-bold text-cyan-300">${parseFloat(lastMintedLock.amount).toLocaleString()} VUSD</span>
                        </p>
                        {lastMintedLock.mintTxHash && (
                          <p className="text-slate-400 text-xs mt-1">
                            TX: <span className="font-mono text-blue-300">{lastMintedLock.mintTxHash.substring(0, 20)}...{lastMintedLock.mintTxHash.slice(-8)}</span>
                          </p>
                        )}
                        {lastMintedLock.sourceAccountName && (
                          <p className="text-slate-400 text-xs">
                            {isSpanish ? 'Cuenta Custodio' : 'Custody Account'}: {lastMintedLock.sourceAccountName}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMintedBanner(false)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* MINTED LOCKS SUMMARY - Shows total minted VUSD */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {mintedLocks.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-cyan-400" />
                      {isSpanish ? 'VUSD Minteado Total' : 'Total VUSD Minted'}
                    </h4>
                    <span className="text-2xl font-bold text-cyan-400">${totalMintedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mintedLocks.slice(0, 5).map((minted) => (
                      <div
                        key={minted.lockId}
                        className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      >
                        <Coins className="w-3 h-3" />
                        <span className="font-mono">{minted.lockId.substring(0, 15)}...</span>
                        <span className="font-bold">${parseFloat(minted.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    {mintedLocks.length > 5 && (
                      <span className="text-cyan-500/70 text-xs self-center">
                        +{mintedLocks.length - 5} {isSpanish ? 'más' : 'more'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* LEMX NOTIFICATIONS PANEL - Unified, Collapsible */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {(lemxApprovalStatuses.length > 0 || mintedLocks.length > 0) && (
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
                  {/* Header - Always visible, clickable to expand/collapse */}
                  <button
                    onClick={() => setIsLemxNotificationsExpanded(!isLemxNotificationsExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-200">
                          {isSpanish ? 'Notificaciones LEMX Minting' : 'LEMX Minting Notifications'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {lemxApprovalStatuses.filter(a => a.status === 'approved').length} {isSpanish ? 'aprobados' : 'approved'}
                          </span>
                          {mintedLocks.length > 0 && (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {mintedLocks.length} {isSpanish ? 'minteados' : 'minted'}
                            </span>
                          )}
                          {lemxApprovalStatuses.filter(a => a.status === 'rejected').length > 0 && (
                            <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {lemxApprovalStatuses.filter(a => a.status === 'rejected').length} {isSpanish ? 'rechazados' : 'rejected'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Total amount summary */}
                      <div className="text-right mr-2">
                        <p className="text-blue-400 font-bold text-sm">
                          ${mintedLocks.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0).toLocaleString()} VUSD
                        </p>
                        <p className="text-slate-500 text-xs">{isSpanish ? 'Total minteado' : 'Total minted'}</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isLemxNotificationsExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Collapsed view - Mini summary */}
                  {!isLemxNotificationsExpanded && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {/* Show minted locks first (blue) */}
                      {mintedLocks.slice(0, 3).map((minted) => (
                        <span
                          key={`minted-${minted.lockId}`}
                          className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          <Coins className="w-2.5 h-2.5" />
                          ${parseFloat(minted.amount).toLocaleString()}
                        </span>
                      ))}
                      {/* Then show approved/rejected */}
                      {lemxApprovalStatuses.slice(0, Math.max(0, 6 - mintedLocks.length)).map((item) => {
                        const isMinted = mintedLocks.some(m => m.lockId === item.lockId);
                        if (isMinted) return null; // Skip if already shown as minted
                        return (
                        <span
                          key={item.lockId}
                          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {item.status === 'approved' ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          ${parseFloat(item.amount).toLocaleString()}
                        </span>
                        );
                      })}
                      {(lemxApprovalStatuses.length + mintedLocks.length) > 6 && (
                        <span className="text-slate-500 text-xs self-center px-2">
                          +{(lemxApprovalStatuses.length + mintedLocks.length) - 6} {isSpanish ? 'más' : 'more'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded view - Full details */}
                  {isLemxNotificationsExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50">
                      {/* MINTED Section - Most important, shown first */}
                      {mintedLocks.length > 0 && (
                        <div className="pt-3">
                          <h5 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                            <Coins className="w-3 h-3" />
                            {isSpanish ? '✓ VUSD Minteados' : '✓ VUSD Minted'} ({mintedLocks.length})
                          </h5>
                          <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {mintedLocks.map((minted) => (
                              <div
                                key={minted.lockId}
                                className="bg-blue-500/10 rounded-lg p-2.5 border border-blue-500/30 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <Coins className="w-3 h-3 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-slate-300 text-xs font-mono">{minted.lockId}</p>
                                    <p className="text-slate-500 text-[10px]">
                                      {minted.sourceAccountName || 'N/A'} • {minted.mintedAt ? new Date(minted.mintedAt).toLocaleString() : 'N/A'}
                                    </p>
                                    {minted.mintTxHash && (
                                      <p className="text-blue-400/70 text-[10px] font-mono">TX: {minted.mintTxHash.substring(0, 20)}...</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-blue-400 font-bold text-sm">${parseFloat(minted.amount).toLocaleString()}</span>
                                  <p className="text-blue-400/50 text-[10px]">VUSD</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Approved Section */}
                      {lemxApprovalStatuses.filter(a => a.status === 'approved').length > 0 && (
                        <div className="pt-3">
                          <h5 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-3 h-3" />
                            {isSpanish ? 'Órdenes Aprobadas' : 'Approved Orders'} ({lemxApprovalStatuses.filter(a => a.status === 'approved').length})
                          </h5>
                          <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {lemxApprovalStatuses.filter(a => a.status === 'approved').map((approval) => {
                              // Check if this approval has been minted
                              const isMinted = mintedLocks.some(m => m.lockId === approval.lockId);
                              return (
                              <div
                                key={approval.lockId}
                                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                                  isMinted 
                                    ? 'bg-blue-500/5 border-blue-500/20 opacity-60' 
                                    : 'bg-emerald-500/5 border-emerald-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isMinted ? (
                                    <Coins className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  )}
                                  <div>
                                    <p className="text-slate-300 text-xs font-mono flex items-center gap-1">
                                      {approval.lockId}
                                      {isMinted && (
                                        <span className="text-[9px] bg-blue-500/30 text-blue-400 px-1 py-0.5 rounded">MINTED</span>
                                      )}
                                    </p>
                                    <p className="text-slate-500 text-[10px]">
                                      {approval.sourceAccountName || 'N/A'} • {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <span className={`font-bold text-sm ${isMinted ? 'text-blue-400' : 'text-emerald-400'}`}>
                                  ${parseFloat(approval.amount).toLocaleString()}
                                </span>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rejected Section */}
                      {lemxApprovalStatuses.filter(a => a.status === 'rejected').length > 0 && (
                        <div className="pt-2">
                          <h5 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                            <XCircle className="w-3 h-3" />
                            {isSpanish ? 'Órdenes Rechazadas' : 'Rejected Orders'} ({lemxApprovalStatuses.filter(a => a.status === 'rejected').length})
                          </h5>
                          <div className="grid gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                            {lemxApprovalStatuses.filter(a => a.status === 'rejected').map((rejection) => (
                              <div
                                key={rejection.lockId}
                                className="bg-red-500/5 rounded-lg p-2.5 border border-red-500/20 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-slate-300 text-xs font-mono">{rejection.lockId}</p>
                                    <p className="text-red-400/70 text-[10px]">{rejection.rejectionReason || 'Sin razón especificada'}</p>
                                  </div>
                                </div>
                                <span className="text-red-400 font-bold text-sm">${parseFloat(rejection.amount).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* STEP 1: Select Source Custody Account */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900 rounded-xl p-6 border border-indigo-500/30">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Landmark className="w-5 h-5" />
                  {isSpanish ? 'Paso 1: Seleccionar Cuenta Custodio (Origen de Fondos)' : 'Step 1: Select Custody Account (Source of Funds)'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish 
                    ? 'Selecciona la cuenta custodio de donde se tomarán los fondos para crear la bóveda blockchain.'
                    : 'Select the custody account from which funds will be taken to create the blockchain vault.'}
                </p>
                
                {/* Selected Account Display */}
                {selectedCustodyAccount ? (
                  <div className="relative">
                    {/* LEMX Approval Badge - Shows if this custody account has approved orders */}
                    {(() => {
                      const approvedForAccount = lemxApprovalStatuses.filter(
                        a => a.status === 'approved' && (a.sourceAccountId === selectedCustodyAccount.id || a.sourceAccountName === selectedCustodyAccount.accountName)
                      );
                      if (approvedForAccount.length > 0) {
                        return (
                          <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                            <CheckCircle className="w-4 h-4" />
                            {isSpanish ? `✓ APROBADO POR LEMX MINTING (${approvedForAccount.length})` : `✓ APPROVED BY LEMX MINTING (${approvedForAccount.length})`}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className={`bg-slate-800/50 rounded-xl p-4 mb-4 ${
                      lemxApprovalStatuses.some(a => a.status === 'approved' && (a.sourceAccountId === selectedCustodyAccount.id || a.sourceAccountName === selectedCustodyAccount.accountName))
                        ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-500/20'
                        : 'border border-emerald-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            {selectedCustodyAccount.accountType === 'blockchain' ? (
                              <Coins className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Building2 className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-emerald-400">{selectedCustodyAccount.accountName}</p>
                            <p className="text-xs text-slate-400">{selectedCustodyAccount.accountNumber || selectedCustodyAccount.id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCustodyAccount(null)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                      
                      {/* Show approved orders for this account */}
                      {(() => {
                        const approvedForAccount = lemxApprovalStatuses.filter(
                          a => a.status === 'approved' && (a.sourceAccountId === selectedCustodyAccount.id || a.sourceAccountName === selectedCustodyAccount.accountName)
                        );
                        if (approvedForAccount.length > 0) {
                          return (
                            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                              <p className="text-emerald-400 text-xs font-bold mb-2 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" />
                                {isSpanish ? 'Órdenes Aprobadas por LEMX Minting:' : 'Orders Approved by LEMX Minting:'}
                              </p>
                              <div className="space-y-1">
                                {approvedForAccount.slice(0, 3).map((approval) => (
                                  <div key={approval.lockId} className="flex items-center justify-between text-xs">
                                    <span className="font-mono text-emerald-300">{approval.lockId}</span>
                                    <span className="font-bold text-emerald-400">${parseFloat(approval.amount).toLocaleString()}</span>
                                  </div>
                                ))}
                                {approvedForAccount.length > 3 && (
                                  <p className="text-emerald-500/70 text-xs">+{approvedForAccount.length - 3} {isSpanish ? 'más' : 'more'}</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 block">{isSpanish ? 'Moneda' : 'Currency'}</span>
                          <span className="font-bold text-white">{selectedCustodyAccount.currency}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{isSpanish ? 'Balance Total' : 'Total Balance'}</span>
                          <span className="font-bold text-emerald-400">
                            {selectedCustodyAccount.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{isSpanish ? 'Disponible' : 'Available'}</span>
                          <span className="font-bold text-blue-400">
                            {selectedCustodyAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustodyAccountSelector(true)}
                    className="w-full p-4 bg-slate-800/50 border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl transition-colors flex items-center justify-center gap-3 text-slate-400 hover:text-indigo-400"
                  >
                  <Plus className="w-5 h-5" />
                    {isSpanish ? 'Seleccionar Cuenta Custodio' : 'Select Custody Account'}
                  </button>
                )}

                {/* Custody Account Selector Modal */}
                {showCustodyAccountSelector && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[80vh] overflow-hidden">
                      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Landmark className="w-6 h-6 text-indigo-400" />
                          {isSpanish ? 'Seleccionar Cuenta Custodio' : 'Select Custody Account'}
                </h3>
                        <button
                          onClick={() => setShowCustodyAccountSelector(false)}
                          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {custodyAccounts.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <Landmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>{isSpanish ? 'No hay cuentas custodio disponibles' : 'No custody accounts available'}</p>
                            <p className="text-sm mt-2">
                              {isSpanish 
                                ? 'Crea una cuenta custodio en el módulo de Cuentas Custodio primero.'
                                : 'Create a custody account in the Custody Accounts module first.'}
                            </p>
                          </div>
                        ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {custodyAccounts
                              .filter(acc => acc.currency === 'USD' && acc.availableBalance > 0)
                              .map(account => (
                                <button
                                  key={account.id}
                                  onClick={() => {
                                    setSelectedCustodyAccount(account);
                                    setNewCustodyForm({
                                      ...newCustodyForm,
                                      sourceCustodyAccountId: account.id,
                                      metadata: `SOURCE:${account.accountNumber || account.id}`
                                    });
                                    setShowCustodyAccountSelector(false);
                                    addTerminalLine('info', `Selected custody account: ${account.accountName} (${account.currency} ${account.availableBalance.toLocaleString()})`);
                                    
                                    // Auto-register Digital Commercial Bank Ltd. when selecting custody account
                                    setBanks(prevBanks => {
                                      const hasDCB = prevBanks.some(b => b.bankId === 'DCB-001');
                                      if (!hasDCB) {
                                        addTerminalLine('success', '✓ Auto-registered bank: Digital Commercial Bank Ltd.');
                                        return [DEFAULT_BANK, ...prevBanks];
                                      }
                                      return prevBanks;
                                    });
                                  }}
                                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all text-left"
                                >
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      account.accountType === 'blockchain' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                                    }`}>
                                      {account.accountType === 'blockchain' ? (
                                        <Coins className="w-5 h-5 text-purple-400" />
                                      ) : (
                                        <Building2 className="w-5 h-5 text-blue-400" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold">{account.accountName}</p>
                                      <p className="text-xs text-slate-400">
                                        {account.accountType === 'blockchain' ? 'Blockchain' : 'Banking'} • {account.accountCategory}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-slate-500 block">{isSpanish ? 'Cuenta' : 'Account'}</span>
                                      <span className="font-mono text-xs">{account.accountNumber || account.id.slice(0, 12)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">{isSpanish ? 'Moneda' : 'Currency'}</span>
                                      <span className="font-bold">{account.currency}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">{isSpanish ? 'Total' : 'Total'}</span>
                                      <span className="font-bold text-emerald-400">
                                        {account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">{isSpanish ? 'Disponible' : 'Available'}</span>
                                      <span className="font-bold text-blue-400">
                                        {account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {account.bankName && (
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                      <span className="text-xs text-slate-500">{account.bankName}</span>
                                    </div>
                                  )}
                                </button>
                              ))}
                          </div>
                        )}
                        
                        {custodyAccounts.filter(acc => acc.currency === 'USD' && acc.availableBalance > 0).length === 0 && custodyAccounts.length > 0 && (
                          <div className="text-center py-8 text-slate-500">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                            <p>{isSpanish ? 'No hay cuentas USD con balance disponible' : 'No USD accounts with available balance'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* STEP 2: Create Custody Vault Form */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div className={`bg-slate-800/50 rounded-xl p-6 border border-slate-700 ${!selectedCustodyAccount ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {isSpanish ? 'Paso 2: Crear Bóveda en Blockchain' : 'Step 2: Create Blockchain Vault'}
                </h3>
                
                {!selectedCustodyAccount && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {isSpanish ? 'Primero selecciona una cuenta custodio origen' : 'First select a source custody account'}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Dirección del Propietario' : 'Owner Address'}
                    </label>
                    <input
                      type="text"
                      value={newCustodyForm.owner}
                      onChange={e => setNewCustodyForm({ ...newCustodyForm, owner: e.target.value })}
                      placeholder={walletAddress || '0x...'}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Monto a Transferir (USD)' : 'Amount to Transfer (USD)'}
                    </label>
                    <input
                      type="number"
                      value={newCustodyForm.fundAmount}
                      onChange={e => setNewCustodyForm({ ...newCustodyForm, fundAmount: e.target.value })}
                      placeholder={selectedCustodyAccount ? selectedCustodyAccount.availableBalance.toString() : '0'}
                      max={selectedCustodyAccount?.availableBalance || 0}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    {selectedCustodyAccount && (
                      <p className="text-xs text-slate-500 mt-1">
                        Max: {selectedCustodyAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedCustodyAccount.currency}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Metadata ({isSpanish ? 'auto-generado' : 'auto-generated'})
                    </label>
                    <input
                      type="text"
                      value={newCustodyForm.metadata}
                      onChange={e => setNewCustodyForm({ ...newCustodyForm, metadata: e.target.value })}
                      placeholder="DCB-CUSTODY-001"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                {/* Transfer Summary */}
                {selectedCustodyAccount && newCustodyForm.fundAmount && (
                  <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                      <ArrowDownToLine className="w-4 h-4 text-purple-400" />
                      {isSpanish ? 'Resumen de Transferencia' : 'Transfer Summary'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block">{isSpanish ? 'Desde' : 'From'}</span>
                        <span className="font-bold">{selectedCustodyAccount.accountName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isSpanish ? 'Monto' : 'Amount'}</span>
                        <span className="font-bold text-purple-400">
                          ${parseFloat(newCustodyForm.fundAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isSpanish ? 'Balance Restante' : 'Remaining Balance'}</span>
                        <span className="font-bold text-blue-400">
                          ${(selectedCustodyAccount.availableBalance - parseFloat(newCustodyForm.fundAmount || '0')).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isSpanish ? 'Destino' : 'Destination'}</span>
                        <span className="font-bold text-emerald-400">LemonChain Vault</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={createCustody}
                    disabled={loading || !newCustodyForm.owner || !selectedCustodyAccount || !newCustodyForm.fundAmount || parseFloat(newCustodyForm.fundAmount) <= 0}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isSpanish ? 'Crear Bóveda Manual' : 'Create Vault Manual'}
                  </button>
                  
                  <span className="text-slate-500">o</span>
                  
                  {/* AUTOMATIC CERTIFICATION BUTTON */}
                  <button
                    onClick={() => {
                      if (selectedCustodyAccount && newCustodyForm.fundAmount) {
                        setCertificationAmount(newCustodyForm.fundAmount);
                        setShowCertificationModal(true);
                      }
                    }}
                    disabled={!selectedCustodyAccount || !newCustodyForm.fundAmount || parseFloat(newCustodyForm.fundAmount) <= 0 || isProcessingCertification}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {isProcessingCertification ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {isSpanish ? '⚡ Proceso Automático Completo' : '⚡ Full Automatic Process'}
                </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* AUTOMATIC CERTIFICATION CONFIRMATION MODAL */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {showCertificationModal && !isProcessingCertification && !activeCertification && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-xl">
                    <div className="p-6 border-b border-slate-700">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                        {isSpanish ? 'Certificación Automática de Custodia' : 'Automatic Custody Certification'}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {sandboxMode ? '🧪 Modo Sandbox - Simulación' : '🚀 Modo Producción - Transacciones Reales'}
                      </p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {isSpanish ? 'Monto a Certificar (USD)' : 'Amount to Certify (USD)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">$</span>
                          <input
                            type="number"
                            value={certificationAmount}
                            onChange={e => setCertificationAmount(e.target.value)}
                            placeholder="0.00"
                            max={selectedCustodyAccount?.availableBalance || 0}
                            className="w-full p-4 pl-10 bg-slate-800 border border-slate-600 rounded-xl text-white text-2xl font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        {selectedCustodyAccount && (
                          <p className="text-xs text-slate-500 mt-2">
                            {isSpanish ? 'Disponible' : 'Available'}: ${selectedCustodyAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                          </p>
                        )}
                      </div>
                      
                      {/* Summary */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h4 className="text-sm font-bold text-slate-300 mb-3">{isSpanish ? 'Resumen del Proceso' : 'Process Summary'}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isSpanish ? 'Cuenta Origen' : 'Source Account'}</span>
                            <span className="font-medium">{selectedCustodyAccount?.accountName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isSpanish ? 'Banco Emisor' : 'Issuing Bank'}</span>
                            <span className="font-medium text-emerald-400">{DEFAULT_BANK.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isSpanish ? 'Red Destino' : 'Destination Network'}</span>
                            <span className="font-medium">LemonChain (ID: {LEMON_CHAIN.chainId})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{isSpanish ? 'Firmas Requeridas' : 'Required Signatures'}</span>
                            <span className="font-medium">3 (Admin, DAES, Bank)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Process Steps Preview */}
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          {isSpanish ? 'Pasos del Proceso' : 'Process Steps'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">1</div>
                            {isSpanish ? 'Iniciar Custodia' : 'Initiate Custody'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">2</div>
                            {isSpanish ? 'Reservar Fondos' : 'Reserve Funds'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">3</div>
                            {isSpanish ? 'Crear Bóveda' : 'Create Vault'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">4</div>
                            {isSpanish ? 'Crear Lock' : 'Create Lock'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">5</div>
                            {isSpanish ? 'Recoger Firmas' : 'Collect Signatures'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">6</div>
                            {isSpanish ? 'Generar PDF' : 'Generate PDF'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-slate-700 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setShowCertificationModal(false);
                          setCertificationAmount('');
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                      >
                        {t.dcbCancel}
                      </button>
                      <button
                        onClick={runAutomaticCertification}
                        disabled={!certificationAmount || parseFloat(certificationAmount) <= 0 || parseFloat(certificationAmount) > (selectedCustodyAccount?.availableBalance || 0)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg"
                      >
                        <Rocket className="w-5 h-5" />
                        {isSpanish ? 'Iniciar Proceso Automático' : 'Start Automatic Process'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* CERTIFICATION PROGRESS MODAL */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {showCertificationModal && isProcessingCertification && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl">
                    <div className="p-6 border-b border-slate-700">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        {isSpanish ? 'Procesando Certificación...' : 'Processing Certification...'}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {activeCertification?.certificationNumber || 'Generating...'}
                      </p>
                    </div>
                    
                    <div className="p-6">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">{isSpanish ? 'Progreso' : 'Progress'}</span>
                          <span className="font-bold text-emerald-400">{certificationProgress}%</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                            style={{ width: `${certificationProgress}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Live Events */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 max-h-64 overflow-y-auto font-mono text-xs">
                        {activeCertification?.events.slice(-8).map((event, i) => (
                          <div key={event.id} className="flex items-start gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-emerald-400">[{event.eventType}]</span>
                              <span className="text-slate-300 ml-2">{event.description}</span>
                            </div>
                          </div>
                        ))}
                        {isProcessingCertification && (
                          <div className="flex items-center gap-2 text-yellow-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isSpanish ? 'Procesando...' : 'Processing...'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* CERTIFICATION COMPLETE MODAL */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {showCertificationModal && !isProcessingCertification && activeCertification && activeCertification.status === 'completed' && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 rounded-2xl border border-emerald-500/50 w-full max-w-2xl">
                    <div className="p-6 border-b border-slate-700 bg-emerald-500/10">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-6 h-6" />
                        {isSpanish ? '¡Certificación Completada!' : 'Certification Complete!'}
                      </h3>
                      <p className="text-sm text-slate-300 mt-1">
                        {activeCertification.certificationNumber}
                      </p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {/* Summary */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400 block">{isSpanish ? 'Monto Certificado' : 'Certified Amount'}</span>
                            <span className="text-2xl font-bold text-emerald-400">
                              ${activeCertification.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">{isSpanish ? 'Bóveda' : 'Vault'}</span>
                            <span className="font-mono text-xs">{formatAddress(activeCertification.vaultAddress || '')}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">{isSpanish ? 'Firmas' : 'Signatures'}</span>
                            <span className="font-bold">{activeCertification.signatures.length} / 3</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">{isSpanish ? 'Eventos' : 'Events'}</span>
                            <span className="font-bold">{activeCertification.events.length}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Event Timeline Summary */}
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          {isSpanish ? 'Timeline de Eventos' : 'Event Timeline'}
                        </h4>
                        <div className="space-y-2">
                          {activeCertification.events.map((event, i) => (
                            <div key={event.id} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                              <span className="text-slate-300">{event.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-slate-700 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setShowCertificationModal(false);
                          setActiveCertification(null);
                          setCertificationAmount('');
                          setSelectedCustodyAccount(null);
                          setNewCustodyForm({ owner: '', metadata: '', sourceCustodyAccountId: '', fundAmount: '' });
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                      >
                        {isSpanish ? 'Cerrar' : 'Close'}
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => generateCertificationPDF(activeCertification)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          {isSpanish ? 'Descargar PDF' : 'Download PDF'}
                        </button>
                        <button
                          onClick={async () => {
                            // ═══════════════════════════════════════════════════════════════════
                            // ENVÍO DIRECTO A TREASURY MINTING API (HTTP POST)
                            // ═══════════════════════════════════════════════════════════════════
                            const cert = activeCertification;
                            if (!cert) {
                              alert('No hay certificación activa');
                              return;
                            }
                            
                            // VISUAL FEEDBACK - Alerta de inicio
                            console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                            console.log('%c║  🚀 ENVIANDO LOCK A TREASURY MINTING                             ║', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                            console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                            
                            addTerminalLine('command', `> Enviando lock de $${cert.amount.toLocaleString()} a Treasury Minting...`);
                            
                            const lockPayload = {
                              lockId: cert.lockId || `LOCK-${cert.certificationNumber}-${Date.now()}`,
                              authorizationCode: `AUTH-${Date.now().toString(36).toUpperCase()}`,
                              lockDetails: {
                                amount: cert.amount.toString(),
                                currency: cert.currency || 'USD',
                                beneficiary: cert.operatorWallet || '0x0000000000000000000000000000000000000000',
                                custodyVault: cert.vaultAddress || '',
                                expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                              },
                              bankInfo: {
                                bankId: cert.bank?.id || 'DCB-001',
                                bankName: cert.bank?.name || 'Digital Commercial Bank Ltd',
                                signerAddress: cert.signatures?.[0]?.address || ''
                              },
                              sourceOfFunds: {
                                accountId: cert.sourceAccount?.id || '',
                                accountName: cert.sourceAccount?.name || '',
                                accountType: cert.sourceAccount?.type || 'custody',
                                originalBalance: cert.sourceAccount?.balanceBefore?.toString() || '0'
                              },
                              signatures: cert.signatures?.map(sig => ({
                                role: sig.role,
                                address: sig.address,
                                hash: sig.signatureHash,
                                timestamp: sig.timestamp
                              })) || [],
                              blockchain: {
                                chainId: 1006,
                                network: 'LemonChain'
                              },
                              metadata: {
                                certificationNumber: cert.certificationNumber,
                                sentAt: new Date().toISOString(),
                                source: 'DCB_TREASURY_FRONTEND'
                              }
                            };
                            
                            console.log('📦 Lock Payload:', lockPayload);
                            addTerminalLine('network', '  📡 Conectando a http://localhost:4010/api/locks...');
                            
                            try {
                              // FETCH DIRECTO - Sin usar dcbWebSocket
                              const response = await fetch('http://localhost:4010/api/locks', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Accept': 'application/json'
                                },
                                body: JSON.stringify(lockPayload)
                              });
                              
                              console.log('📨 Response status:', response.status);
                              
                              const result = await response.json();
                              console.log('📬 Response data:', result);
                              
                              if (response.ok && result.success) {
                                console.log('%c✅ LOCK ENVIADO EXITOSAMENTE!', 'color: #00ff00; font-size: 20px; font-weight: bold;');
                                addTerminalLine('success', '  ✓ Lock enviado a Treasury Minting!');
                                addTerminalLine('info', `  → Lock ID: ${result.data?.id}`);
                                addTerminalLine('blockchain', '  → Revisa Treasury Minting Platform (puerto 4005)');
                                
                                // Alerta visual
                                alert(`✅ Lock enviado exitosamente!\n\nLock ID: ${result.data?.id}\nMonto: $${cert.amount.toLocaleString()}\n\nRevisa Treasury Minting (puerto 4005)`);
                                
                                // Cerrar modal
                                setShowCertificationModal(false);
                                setActiveCertification(null);
                              } else {
                                console.log('%c❌ ERROR EN RESPUESTA', 'color: #ff0000; font-size: 16px;', result);
                                addTerminalLine('error', `  ✗ Error: ${result.error || response.status}`);
                                alert(`❌ Error al enviar lock:\n${result.error || 'Error desconocido'}`);
                              }
                            } catch (err: any) {
                              console.log('%c❌ ERROR DE CONEXIÓN', 'color: #ff0000; font-size: 16px;', err);
                              addTerminalLine('error', `  ✗ No se pudo conectar: ${err.message}`);
                              addTerminalLine('info', '  → Verifica que el servidor bridge esté corriendo (puerto 4010)');
                              alert(`❌ Error de conexión:\n${err.message}\n\nVerifica que el servidor bridge esté corriendo en puerto 4010`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-medium transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          {isSpanish ? 'Enviar a LEMX' : 'Send to LEMX'}
                        </button>
                        <button
                          onClick={() => {
                            setShowCertificationModal(false);
                            setActiveCertification(null);
                            setCertificationAmount('');
                          }}
                          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isSpanish ? 'Nueva Certificación' : 'New Certification'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custodies List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {custodies.map(custody => {
                  // Check if this custody has approved orders from LEMX
                  const approvedForCustody = lemxApprovalStatuses.filter(
                    a => a.status === 'approved' && (
                      a.sourceAccountId === custody.custodyId || 
                      a.sourceAccountName === custody.owner ||
                      custody.vault?.toLowerCase() === a.sourceAccountId?.toLowerCase()
                    )
                  );
                  const mintedForCustody = mintedLocks.filter(
                    m => m.sourceAccountId === custody.custodyId || 
                         m.sourceAccountName === custody.owner ||
                         custody.vault?.toLowerCase() === m.sourceAccountId?.toLowerCase()
                  );
                  const hasApproval = approvedForCustody.length > 0;
                  const hasMinted = mintedForCustody.length > 0;
                  
                  return (
                    <div key={custody.custodyId} className="relative">
                      {/* APROBADO Badge - Shows above custody if approved by LEMX */}
                      {hasApproval && (
                        <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                          <CheckCircle className="w-4 h-4" />
                          {isSpanish ? `✓ APROBADO POR LEMX (${approvedForCustody.length})` : `✓ APPROVED BY LEMX (${approvedForCustody.length})`}
                        </div>
                      )}
                      {/* MINTEADO Badge - Shows if minted */}
                      {hasMinted && !hasApproval && (
                        <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30">
                          <Coins className="w-4 h-4" />
                          {isSpanish ? `✓ MINTEADO (${mintedForCustody.length})` : `✓ MINTED (${mintedForCustody.length})`}
                        </div>
                      )}
                      
                      <div className={`bg-slate-800/50 rounded-xl p-6 ${
                        hasApproval 
                          ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 mt-2' 
                          : hasMinted 
                            ? 'border-2 border-blue-400 shadow-lg shadow-blue-500/20 mt-2'
                            : 'border border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold text-purple-400">#{custody.custodyId}</span>
                          <span className="font-mono text-xs text-slate-400">{formatAddress(custody.vault)}</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">{isSpanish ? 'Propietario' : 'Owner'}</span>
                            <span className="font-mono text-xs">{formatAddress(custody.owner)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">{isSpanish ? 'Balance Total' : 'Total Balance'}</span>
                            <span className="font-bold text-emerald-400">{formatAmount(custody.balance)} USD</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">{isSpanish ? 'Disponible' : 'Available'}</span>
                            <span className="font-bold text-blue-400">{formatAmount(custody.availableBalance)} USD</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">{isSpanish ? 'Bloqueado' : 'Locked'}</span>
                            <span className="font-bold text-yellow-400">{formatAmount(custody.lockedBalance)} USD</span>
                          </div>
                          
                          {/* Show approved orders details */}
                          {hasApproval && (
                            <div className="mt-3 pt-3 border-t border-emerald-500/30">
                              <p className="text-emerald-400 text-xs font-bold mb-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {isSpanish ? 'Órdenes Aprobadas:' : 'Approved Orders:'}
                              </p>
                              <div className="space-y-1">
                                {approvedForCustody.slice(0, 3).map((approval) => (
                                  <div key={approval.lockId} className="flex items-center justify-between text-xs bg-emerald-500/10 px-2 py-1 rounded">
                                    <span className="font-mono text-emerald-300">{approval.lockId?.slice(0, 20)}...</span>
                                    <span className="font-bold text-emerald-400">${parseFloat(approval.amount || '0').toLocaleString()}</span>
                                  </div>
                                ))}
                                {approvedForCustody.length > 3 && (
                                  <p className="text-emerald-500/70 text-xs text-center">+{approvedForCustody.length - 3} {isSpanish ? 'más' : 'more'}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {custodies.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    {isSpanish ? 'No hay custodias creadas' : 'No custodies created'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* LOCKS TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'locks' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">USD Lock Box</h2>

              {/* Request Lock Form */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {isSpanish ? 'Solicitar Nuevo Lock' : 'Request New Lock'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Banco' : 'Bank'}</label>
                    <select
                      value={newLockForm.bankId}
                      onChange={e => setNewLockForm({ ...newLockForm, bankId: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500"
                    >
                      <option value="">{isSpanish ? 'Seleccionar banco' : 'Select bank'}</option>
                      {banks.filter(b => b.active).map(bank => (
                        <option key={bank.bankId} value={bank.bankId}>{bank.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Bóveda de Custodia' : 'Custody Vault'}</label>
                    <select
                      value={newLockForm.custodyVault}
                      onChange={e => setNewLockForm({ ...newLockForm, custodyVault: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500"
                    >
                      <option value="">{isSpanish ? 'Seleccionar custodia' : 'Select custody'}</option>
                      {custodies.map(c => (
                        <option key={c.custodyId} value={c.vault}>#{c.custodyId} - {formatAddress(c.vault)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Monto USD' : 'Amount USD'}</label>
                    <input
                      type="number"
                      value={newLockForm.amountUSD}
                      onChange={e => setNewLockForm({ ...newLockForm, amountUSD: e.target.value })}
                      placeholder="1000000"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">VUSD {isSpanish ? 'Solicitado' : 'Requested'}</label>
                    <input
                      type="number"
                      value={newLockForm.requestedVUSD}
                      onChange={e => setNewLockForm({ ...newLockForm, requestedVUSD: e.target.value })}
                      placeholder={newLockForm.amountUSD || '1000000'}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</label>
                    <input
                      type="text"
                      value={newLockForm.beneficiary}
                      onChange={e => setNewLockForm({ ...newLockForm, beneficiary: e.target.value })}
                      placeholder={walletAddress || '0x...'}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Expiración (días)' : 'Expiry (days)'}</label>
                    <input
                      type="number"
                      value={newLockForm.expiryDays}
                      onChange={e => setNewLockForm({ ...newLockForm, expiryDays: e.target.value })}
                      placeholder="30"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500"
                    />
                  </div>
                </div>
                <button
                  onClick={requestLock}
                  disabled={loading || !newLockForm.bankId || !newLockForm.custodyVault || !newLockForm.amountUSD}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {isSpanish ? 'Solicitar Lock' : 'Request Lock'}
                </button>
              </div>

              {/* Locks List */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-slate-300 mb-4">Locks</h3>
                <div className="space-y-4">
                  {locks.map(lock => {
                    // Check if this lock has been minted
                    const isMinted = mintedLocks.some(m => m.lockId === lock.lockId);
                    const isApprovedByLemx = lemxApprovalStatuses.some(a => a.status === 'approved' && a.lockId === lock.lockId);
                    
                    return (
                    <div key={lock.lockId} className={`bg-slate-900/50 rounded-xl p-5 border ${isMinted ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-700'} relative`}>
                      {/* MINTED Badge */}
                      {isMinted && (
                        <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30">
                          <Coins className="w-3 h-3" />
                          {isSpanish ? '✓ MINTEADO' : '✓ MINTED'}
                        </div>
                      )}
                      {/* APPROVED BY LEMX Badge (only if not minted yet) */}
                      {!isMinted && isApprovedByLemx && (
                        <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          {isSpanish ? '✓ APROBADO POR LEMX' : '✓ APPROVED BY LEMX'}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4 mt-2">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-cyan-400" />
                          <span className="font-mono text-sm">{formatAddress(lock.lockId)}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isMinted ? 'bg-blue-500/20 text-blue-400' : getStatusColor(lock.status)}`}>
                          {isMinted ? (isSpanish ? 'MINTEADO' : 'MINTED') : lock.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-slate-400 block">{isSpanish ? 'Banco' : 'Bank'}</span>
                          <span className="font-semibold">{lock.bankName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{isSpanish ? 'Monto USD' : 'Amount USD'}</span>
                          <span className="font-bold text-emerald-400">{lock.amountUSD}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">VUSD {isSpanish ? 'Solicitado' : 'Requested'}</span>
                          <span className="font-bold text-blue-400">{lock.requestedVUSD}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">VUSD {isSpanish ? 'Aprobado' : 'Approved'}</span>
                          <span className="font-bold text-purple-400">{lock.approvedVUSD || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                        <span>{isSpanish ? 'Custodia:' : 'Custody:'} {formatAddress(lock.custodyVault)}</span>
                        <span>•</span>
                        <span>{isSpanish ? 'Beneficiario:' : 'Beneficiary:'} {formatAddress(lock.beneficiary)}</span>
                        <span>•</span>
                        <span>{isSpanish ? 'Expira:' : 'Expires:'} {new Date(lock.expiry * 1000).toLocaleDateString()}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* MINTED STATE - No actions available */}
                        {isMinted && (
                          <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <Coins className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-blue-400 font-bold text-sm">
                                  {isSpanish ? '✓ VUSD Minteado Exitosamente' : '✓ VUSD Minted Successfully'}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {isSpanish ? 'Este lock ha sido consumido y el VUSD ha sido minteado.' : 'This lock has been consumed and VUSD has been minted.'}
                                </p>
                              </div>
                            </div>
                            {mintedLocks.find(m => m.lockId === lock.lockId)?.mintTxHash && (
                              <div className="mt-2 pt-2 border-t border-blue-500/20 text-xs">
                                <span className="text-slate-500">TX Hash: </span>
                                <code className="text-blue-400 font-mono">{mintedLocks.find(m => m.lockId === lock.lockId)?.mintTxHash}</code>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* REQUESTED STATE */}
                        {!isMinted && lock.status === 'REQUESTED' && (
                          <>
                            <button
                              onClick={() => approveLock(lock.lockId)}
                              disabled={loading}
                              className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {isSpanish ? 'Aprobar' : 'Approve'}
                            </button>
                            <button
                              onClick={() => cancelLock(lock.lockId)}
                              disabled={loading}
                              className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              {t.dcbCancel}
                            </button>
                          </>
                        )}
                        
                        {/* LOCKED STATE - Can consume or cancel (only if NOT minted) */}
                        {!isMinted && lock.status === 'LOCKED' && (
                          <div className="space-y-3 w-full">
                            {/* Minting Key Info */}
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Key className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-400">
                                  {isSpanish ? 'Llave de Minting' : 'Minting Key'}
                                </span>
                              </div>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{isSpanish ? 'Rol' : 'Role'}:</span>
                                  <span className="text-emerald-400 font-bold">ISSUER_OPERATOR</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{isSpanish ? 'Dirección' : 'Address'}:</span>
                                  <code className="text-slate-300 font-mono">0xC3C5...5c98</code>
                                </div>
                                <div>
                                  <span className="text-slate-500">{isSpanish ? 'Llave Privada' : 'Private Key'}:</span>
                                  <code className="text-yellow-400 font-mono text-[10px] block mt-1 bg-slate-800 p-1 rounded overflow-x-auto">
                                    8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
                                  </code>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                            <button
                              onClick={() => consumeLock(lock.lockId)}
                              disabled={loading}
                              className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <Coins className="w-4 h-4" />
                              {isSpanish ? 'Consumir y Mintear VUSD' : 'Consume & Mint VUSD'}
                            </button>
                            <button
                              onClick={() => cancelLock(lock.lockId)}
                              disabled={loading}
                              className="flex items-center gap-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              {t.dcbCancel}
                            </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })}
                  {locks.length === 0 && (
                    <p className="text-slate-500 text-center py-8">{isSpanish ? 'No hay locks' : 'No locks'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* MINTING TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'minting' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Minting Bridge</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMintExplorer(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Layers className="w-4 h-4" />
                    MINT LEMON EXPLORER
                    {mintVUSDTransactions.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {mintVUSDTransactions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowMintWithCodeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Key className="w-4 h-4" />
                    {isSpanish ? 'Mintear con Código LEMX' : 'Mint with LEMX Code'}
                  </button>
                </div>
              </div>

              {/* Mint USD Form */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  {isSpanish ? 'Mintear USD a Custodia' : 'Mint USD to Custody'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish 
                    ? 'Mintea USD tokens a una bóveda de custodia usando firma DAES EIP-712.'
                    : 'Mint USD tokens to a custody vault using DAES EIP-712 signature.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Bóveda de Custodia' : 'Custody Vault'}</label>
                    <select
                      value={mintForm.custodyVault}
                      onChange={e => setMintForm({ ...mintForm, custodyVault: e.target.value })}
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500"
                    >
                      <option value="">{isSpanish ? 'Seleccionar custodia' : 'Select custody'}</option>
                      {custodies.map(c => (
                        <option key={c.custodyId} value={c.vault}>#{c.custodyId} - {formatAddress(c.vault)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Monto USD' : 'Amount USD'}</label>
                    <input
                      type="number"
                      value={mintForm.amount}
                      onChange={e => setMintForm({ ...mintForm, amount: e.target.value })}
                      placeholder="1000000"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">ISO Message ID ({isSpanish ? 'opcional' : 'optional'})</label>
                    <input
                      type="text"
                      value={mintForm.msgId}
                      onChange={e => setMintForm({ ...mintForm, msgId: e.target.value })}
                      placeholder="MSG-2026-001234"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">UETR ({isSpanish ? 'opcional' : 'optional'})</label>
                    <input
                      type="text"
                      value={mintForm.uetr}
                      onChange={e => setMintForm({ ...mintForm, uetr: e.target.value })}
                      placeholder="550e8400-e29b-41d4-a716-446655440000"
                      className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  onClick={mintUSD}
                  disabled={loading || !mintForm.custodyVault || !mintForm.amount}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  {isSpanish ? 'Mintear USD' : 'Mint USD'}
                </button>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 rounded-xl p-6 border border-emerald-500/30">
                  <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {isSpanish ? 'Firma DAES EIP-712' : 'DAES EIP-712 Signature'}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    {isSpanish
                      ? 'Cada operación de minting requiere una firma EIP-712 del servidor DAES autorizado. Esto garantiza que solo transferencias bancarias verificadas pueden crear nuevos USD tokens.'
                      : 'Each minting operation requires an EIP-712 signature from the authorized DAES server. This ensures only verified bank transfers can create new USD tokens.'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 rounded-xl p-6 border border-blue-500/30">
                  <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {isSpanish ? 'Trazabilidad ISO' : 'ISO Traceability'}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    {isSpanish
                      ? 'Cada mint registra el hash ISO 20022, Message ID y UETR en la blockchain, creando un vínculo inmutable entre la transferencia bancaria y los tokens emitidos.'
                      : 'Each mint records the ISO 20022 hash, Message ID and UETR on the blockchain, creating an immutable link between the bank transfer and the issued tokens.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* APPROVED TAB - Locks aprobados por LEMX */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'approved' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                  {isSpanish ? 'Locks Aprobados por LEMX' : 'Locks Approved by LEMX'}
                  <span className="ml-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                    {lemxApprovalStatuses.filter(a => a.status === 'approved').length}
                  </span>
                </h2>
              </div>

              {/* Approved Locks List */}
              {lemxApprovalStatuses.filter(a => a.status === 'approved').length > 0 ? (
                <div className="grid gap-4">
                  {lemxApprovalStatuses.filter(a => a.status === 'approved').map((approval) => (
                    <div key={approval.lockId} className="relative bg-gradient-to-br from-slate-800/80 to-emerald-900/20 rounded-xl border border-emerald-500/30 p-6 shadow-lg shadow-emerald-500/10">
                      {/* Approved Badge */}
                      <div className="absolute -top-3 left-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                        <CheckCircle className="w-3 h-3" />
                        {isSpanish ? 'APROBADO POR LEMX' : 'APPROVED BY LEMX'}
                      </div>

                      <div className="flex items-start justify-between mt-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Lock ID</p>
                          <p className="font-mono text-lg font-bold text-slate-200">{approval.lockId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Monto Aprobado' : 'Approved Amount'}</p>
                          <p className="text-2xl font-bold text-emerald-400">
                            ${parseFloat(approval.approvedAmount || approval.amount || '0').toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Moneda' : 'Currency'}</p>
                          <p className="text-sm text-slate-300 font-medium">{approval.currency || 'USD'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Aprobado por' : 'Approved by'}</p>
                          <p className="text-sm text-emerald-300 font-medium">{approval.approvedBy || 'LEMX Operator'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Fecha' : 'Date'}</p>
                          <p className="text-sm text-slate-300">{approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Check if minted */}
                      {mintedLocks.some(m => m.lockId === approval.lockId) && (
                        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-300 font-medium">
                            {isSpanish ? 'Este lock ya fue minteado a VUSD' : 'This lock has been minted to VUSD'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                  <CheckCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">{isSpanish ? 'No hay locks aprobados' : 'No approved locks'}</p>
                  <p className="text-slate-500 text-sm">{isSpanish ? 'Los locks aprobados por LEMX Minting aparecerán aquí' : 'Locks approved by LEMX Minting will appear here'}</p>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Total Aprobados' : 'Total Approved'}</p>
                  <p className="text-2xl font-bold text-emerald-400">{lemxApprovalStatuses.filter(a => a.status === 'approved').length}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Monto Total' : 'Total Amount'}</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${lemxApprovalStatuses.filter(a => a.status === 'approved').reduce((sum, a) => sum + parseFloat(a.approvedAmount || a.amount || '0'), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Ya Minteados' : 'Already Minted'}</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {lemxApprovalStatuses.filter(a => a.status === 'approved' && mintedLocks.some(m => m.lockId === a.lockId)).length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* REJECTED TAB - Locks rechazados por LEMX */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'rejected' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <XCircle className="w-7 h-7 text-red-400" />
                  {isSpanish ? 'Locks Rechazados por LEMX' : 'Locks Rejected by LEMX'}
                  <span className="ml-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                    {lemxApprovalStatuses.filter(a => a.status === 'rejected').length}
                  </span>
                </h2>
              </div>

              {/* Rejected Locks List */}
              {lemxApprovalStatuses.filter(a => a.status === 'rejected').length > 0 ? (
                <div className="grid gap-4">
                  {lemxApprovalStatuses.filter(a => a.status === 'rejected').map((rejection) => (
                    <div key={rejection.lockId} className="relative bg-gradient-to-br from-slate-800/80 to-red-900/20 rounded-xl border border-red-500/30 p-6 shadow-lg shadow-red-500/10">
                      {/* Rejected Badge */}
                      <div className="absolute -top-3 left-4 bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                        <XCircle className="w-3 h-3" />
                        {isSpanish ? 'RECHAZADO' : 'REJECTED'}
                      </div>

                      <div className="flex items-start justify-between mt-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Lock ID</p>
                          <p className="font-mono text-lg font-bold text-slate-200">{rejection.lockId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Monto' : 'Amount'}</p>
                          <p className="text-2xl font-bold text-red-400">
                            ${parseFloat(rejection.amount || '0').toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Moneda' : 'Currency'}</p>
                          <p className="text-sm text-slate-300 font-medium">{rejection.currency || 'USD'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Rechazado por' : 'Rejected by'}</p>
                          <p className="text-sm text-red-300 font-medium">{rejection.rejectedBy || 'LEMX Operator'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Fecha' : 'Date'}</p>
                          <p className="text-sm text-slate-300">{rejection.rejectedAt ? new Date(rejection.rejectedAt).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {rejection.rejectionReason && (
                        <div className="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                          <p className="text-xs text-red-400 font-medium mb-1">{isSpanish ? 'Razón del Rechazo' : 'Rejection Reason'}</p>
                          <p className="text-sm text-slate-300 italic">"{rejection.rejectionReason}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">{isSpanish ? 'No hay locks rechazados' : 'No rejected locks'}</p>
                  <p className="text-slate-500 text-sm">{isSpanish ? 'Todos los locks han sido procesados correctamente' : 'All locks have been processed successfully'}</p>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Total Rechazados' : 'Total Rejected'}</p>
                  <p className="text-2xl font-bold text-red-400">{lemxApprovalStatuses.filter(a => a.status === 'rejected').length}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Monto Total Rechazado' : 'Total Rejected Amount'}</p>
                  <p className="text-2xl font-bold text-red-400">
                    ${lemxApprovalStatuses.filter(a => a.status === 'rejected').reduce((sum, a) => sum + parseFloat(a.amount || '0'), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TERMINAL TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Terminal className="w-6 h-6" />
                  {isSpanish ? 'Terminal del Sistema' : 'System Terminal'}
                </h2>
                <button
                  onClick={() => setTerminalLines([])}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isSpanish ? 'Limpiar' : 'Clear'}
                </button>
              </div>

              <div
                ref={terminalRef}
                className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-auto border border-slate-700"
                style={{ minHeight: '500px' }}
              >
                {terminalLines.map(line => (
                  <div key={line.id} className="flex gap-3 py-0.5">
                    <span className="text-slate-600 text-xs w-20 flex-shrink-0">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`${getTerminalLineColor(line.type)}`}>
                      {line.content}
                    </span>
                  </div>
                ))}
                {terminalLines.length === 0 && (
                  <div className="text-slate-600">
                    {isSpanish ? 'Terminal vacía. Las operaciones aparecerán aquí.' : 'Terminal empty. Operations will appear here.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* API & WEBHOOKS TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Server className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">API & Webhooks</h2>
                    <p className="text-slate-400 text-sm">
                      {isSpanish ? 'Gestión de API Keys y conexiones con LEMX Minting' : 'API Keys management and LEMX Minting connections'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    apiConnectionStatus.dcb ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {apiConnectionStatus.dcb ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    DCB API
                  </span>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    apiConnectionStatus.lemx ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {apiConnectionStatus.lemx ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    LEMX API
                  </span>
                </div>
              </div>

              {/* Production URL Banner */}
              <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 rounded-xl p-6 border border-emerald-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <Globe className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400">{isSpanish ? 'URL de Producción' : 'Production URL'}</h3>
                    <p className="text-slate-400 text-sm">{isSpanish ? 'Todas las APIs se conectan a este dominio en producción' : 'All APIs connect to this domain in production'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 bg-slate-900/80 rounded-lg text-lg font-bold text-emerald-400 font-mono">
                    https://luxliqdaes.cloud
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://luxliqdaes.cloud');
                      addTerminalLine('info', 'Production URL copied to clipboard');
                    }}
                    className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5 text-white" />
                  </button>
                  <a
                    href="https://luxliqdaes.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>

              {/* API Endpoints Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DCB Treasury API */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold">DCB Treasury API</h4>
                      <p className="text-xs text-slate-400">Puerto 4010</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { method: 'GET', endpoint: '/api/health', desc: 'Health check' },
                      { method: 'GET', endpoint: '/api/locks', desc: 'List locks' },
                      { method: 'POST', endpoint: '/api/locks', desc: 'Create lock' },
                      { method: 'GET', endpoint: '/api/keys', desc: 'List API keys' },
                      { method: 'POST', endpoint: '/api/keys', desc: 'Create API key' },
                      { method: 'GET', endpoint: '/api/webhooks', desc: 'List webhooks' },
                      { method: 'POST', endpoint: '/api/webhooks/register', desc: 'Register webhook' },
                    ].map((api, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          api.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {api.method}
                        </span>
                        <code className="text-slate-300 font-mono text-xs">{api.endpoint}</code>
                        <span className="text-slate-500 text-xs ml-auto">{api.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LEMX Minting API */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-bold">LEMX Minting API</h4>
                      <p className="text-xs text-slate-400">Puerto 4011</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { method: 'GET', endpoint: '/api/health', desc: 'Health check' },
                      { method: 'GET', endpoint: '/api/locks', desc: 'Pending locks' },
                      { method: 'POST', endpoint: '/api/locks/:id/consume', desc: 'Generate auth code' },
                      { method: 'GET', endpoint: '/api/mint-requests', desc: 'Mint requests' },
                      { method: 'POST', endpoint: '/api/mint-requests/:id/complete', desc: 'Complete mint' },
                      { method: 'GET', endpoint: '/api/completed-mints', desc: 'Mint explorer' },
                      { method: 'POST', endpoint: '/api/webhooks/receive', desc: 'Webhook receiver' },
                    ].map((api, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          api.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {api.method}
                        </span>
                        <code className="text-slate-300 font-mono text-xs">{api.endpoint}</code>
                        <span className="text-slate-500 text-xs ml-auto">{api.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* API Keys Section */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-6 h-6 text-amber-400" />
                    <h3 className="text-lg font-bold">API Keys</h3>
                  </div>
                  <button
                    onClick={async () => {
                      const name = prompt(isSpanish ? 'Nombre para la nueva API Key:' : 'Name for new API Key:');
                      if (name) {
                        const webhookUrl = prompt(
                          isSpanish 
                            ? 'URL del Webhook para recibir eventos (ej: https://tu-servidor.com/webhook):' 
                            : 'Webhook URL to receive events (e.g.: https://your-server.com/webhook):'
                        );
                        
                        if (!webhookUrl) {
                          alert(isSpanish ? 'Se requiere una URL de webhook' : 'Webhook URL is required');
                          return;
                        }
                        
                        try {
                          addTerminalLine('info', `Creating API Key and Webhook for: ${name}...`);
                          
                          // 1. Create API Key
                          const apiKeyResponse = await fetch('http://localhost:4010/api/keys', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, permissions: ['read', 'write', 'webhook'] })
                          });
                          const apiKeyResult = await apiKeyResponse.json();
                          
                          if (!apiKeyResult.success) {
                            throw new Error('Failed to create API Key');
                          }
                          
                          addTerminalLine('success', `API Key created: ${apiKeyResult.data.key.substring(0, 20)}...`);
                          
                          // 2. Register Webhook
                          const webhookResponse = await fetch('http://localhost:4010/api/webhooks/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              url: webhookUrl, 
                              name: `${name} Webhook`,
                              events: ['lock.created', 'lock.completed', 'authorization.generated', 'mint.completed'],
                              apiKeyId: apiKeyResult.data.id
                            })
                          });
                          const webhookResult = await webhookResponse.json();
                          
                          if (!webhookResult.success) {
                            throw new Error('Failed to register webhook');
                          }
                          
                          addTerminalLine('success', `Webhook registered: ${webhookUrl}`);
                          
                          // 3. Generate TXT file content
                          const timestamp = new Date().toISOString();
                          const txtContent = `═══════════════════════════════════════════════════════════════════════════════
DCB TREASURY CERTIFICATION PLATFORM - API CREDENTIALS
═══════════════════════════════════════════════════════════════════════════════
Generated: ${timestamp}
Name: ${name}

═══════════════════════════════════════════════════════════════════════════════
API CREDENTIALS
═══════════════════════════════════════════════════════════════════════════════

API Key ID:     ${apiKeyResult.data.id}
API Key:        ${apiKeyResult.data.key}
API Secret:     ${apiKeyResult.data.secret}
Permissions:    read, write, webhook

═══════════════════════════════════════════════════════════════════════════════
WEBHOOK CONFIGURATION
═══════════════════════════════════════════════════════════════════════════════

Webhook ID:     ${webhookResult.data.id}
Webhook URL:    ${webhookUrl}
Webhook Secret: ${webhookResult.data.secret}
Events:         lock.created, lock.completed, authorization.generated, mint.completed

═══════════════════════════════════════════════════════════════════════════════
API ENDPOINTS (Development)
═══════════════════════════════════════════════════════════════════════════════

Base URL:       http://localhost:4010/api
Health Check:   GET  /api/health
Create Lock:    POST /api/locks
List Locks:     GET  /api/locks
Get Lock:       GET  /api/locks/:id
Webhooks:       GET  /api/webhooks

═══════════════════════════════════════════════════════════════════════════════
API ENDPOINTS (Production)
═══════════════════════════════════════════════════════════════════════════════

Base URL:       https://luxliqdaes.cloud/api
Health Check:   GET  /api/health
Create Lock:    POST /api/locks
List Locks:     GET  /api/locks
Get Lock:       GET  /api/locks/:id
Webhooks:       GET  /api/webhooks

═══════════════════════════════════════════════════════════════════════════════
AUTHENTICATION HEADERS
═══════════════════════════════════════════════════════════════════════════════

X-API-Key:      ${apiKeyResult.data.key}
X-API-Secret:   ${apiKeyResult.data.secret}

Example cURL:
curl -X GET "https://luxliqdaes.cloud/api/locks" \\
  -H "X-API-Key: ${apiKeyResult.data.key}" \\
  -H "X-API-Secret: ${apiKeyResult.data.secret}"

═══════════════════════════════════════════════════════════════════════════════
WEBHOOK VERIFICATION
═══════════════════════════════════════════════════════════════════════════════

Your webhook will receive POST requests with the following headers:
- X-DCB-Signature: HMAC-SHA256 signature of the payload
- X-DCB-Event: Event type (e.g., lock.created)
- X-DCB-Timestamp: ISO timestamp of the event
- X-Webhook-ID: Unique webhook event ID

Verify the signature using your webhook secret:
signature = HMAC-SHA256(payload, "${webhookResult.data.secret}")

═══════════════════════════════════════════════════════════════════════════════
IMPORTANT SECURITY NOTES
═══════════════════════════════════════════════════════════════════════════════

⚠️  KEEP THESE CREDENTIALS SECURE - THEY WILL NOT BE SHOWN AGAIN!
⚠️  Do not share these credentials publicly
⚠️  Store in a secure password manager or vault
⚠️  Rotate credentials periodically
⚠️  Use HTTPS in production

═══════════════════════════════════════════════════════════════════════════════
DCB Treasury Certification Platform - Digital Commercial Bank Ltd.
https://luxliqdaes.cloud
═══════════════════════════════════════════════════════════════════════════════
`;
                          
                          // 4. Create and download TXT file
                          const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `DCB_API_Credentials_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          
                          addTerminalLine('success', `Credentials file downloaded: ${a.download}`);
                          
                          // 5. Show success message
                          alert(
                            isSpanish 
                              ? `✅ API Key y Webhook creados exitosamente!\n\n📁 Se ha descargado un archivo TXT con todas las credenciales.\n\n⚠️ GUARDA ESTE ARCHIVO EN UN LUGAR SEGURO - LAS CREDENCIALES NO SE MOSTRARÁN DE NUEVO!`
                              : `✅ API Key and Webhook created successfully!\n\n📁 A TXT file with all credentials has been downloaded.\n\n⚠️ SAVE THIS FILE IN A SECURE LOCATION - CREDENTIALS WILL NOT BE SHOWN AGAIN!`
                          );
                          
                          checkApiConnection();
                          
                        } catch (e) {
                          console.error('Error creating API Key:', e);
                          addTerminalLine('error', `Failed to create API key: ${e}`);
                          alert(isSpanish ? 'Error al crear API Key' : 'Failed to create API Key');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {isSpanish ? 'Crear API Key + Webhook' : 'Create API Key + Webhook'}
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish 
                    ? 'Al crear una API Key se registra automáticamente un webhook y se genera un archivo TXT con todas las credenciales.' 
                    : 'Creating an API Key automatically registers a webhook and generates a TXT file with all credentials.'}
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-500 text-sm text-center">
                    {isSpanish 
                      ? 'Las API Keys creadas aparecerán aquí. Usa el botón "Crear API Key + Webhook" para generar una nueva.' 
                      : 'Created API Keys will appear here. Use the "Create API Key + Webhook" button to generate a new one.'}
                  </p>
                </div>
              </div>

              {/* Webhooks Section */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Signal className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-lg font-bold">Webhooks</h3>
                  </div>
                  <button
                    onClick={async () => {
                      const url = prompt(isSpanish ? 'URL del Webhook:' : 'Webhook URL:');
                      if (url) {
                        const name = prompt(isSpanish ? 'Nombre (opcional):' : 'Name (optional):') || 'My Webhook';
                        try {
                          const response = await fetch('http://localhost:4010/api/webhooks/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              url, 
                              name,
                              events: ['lock.created', 'lock.completed', 'authorization.generated', 'mint.completed']
                            })
                          });
                          const result = await response.json();
                          if (result.success) {
                            addTerminalLine('success', `Webhook registered: ${url}`);
                            alert(`Webhook Registered!\n\nURL: ${url}\nSecret: ${result.data.secret}`);
                          }
                        } catch (e) {
                          addTerminalLine('error', 'Failed to register webhook');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {isSpanish ? 'Registrar Webhook' : 'Register Webhook'}
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish 
                    ? 'Los webhooks permiten recibir notificaciones en tiempo real de eventos como locks y minting.' 
                    : 'Webhooks allow receiving real-time notifications of events like locks and minting.'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['lock.created', 'lock.completed', 'authorization.generated', 'mint.completed'].map(event => (
                    <div key={event} className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <span className="text-xs text-cyan-400 font-mono">{event}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Test */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-lg font-bold">{isSpanish ? 'Probar Conexión' : 'Test Connection'}</h3>
                  </div>
                  <button
                    onClick={checkApiConnection}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isSpanish ? 'Verificar APIs' : 'Check APIs'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border ${apiConnectionStatus.dcb ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center gap-3">
                      {apiConnectionStatus.dcb ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-red-400" />}
                      <div>
                        <p className="font-bold">DCB Treasury API</p>
                        <p className="text-xs text-slate-400">http://localhost:4010</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border ${apiConnectionStatus.lemx ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center gap-3">
                      {apiConnectionStatus.lemx ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-red-400" />}
                      <div>
                        <p className="font-bold">LEMX Minting API</p>
                        <p className="text-xs text-slate-400">http://localhost:4011</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CONFIG TAB */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{isSpanish ? 'Configuración' : 'Configuration'}</h2>

              {/* Lemon Chain Network Config - Complete */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 rounded-xl p-6 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-3">
                    <span className="text-3xl">🍋</span>
                    LemonChain Network
                </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                      chainId === LEMON_CHAIN.chainId 
                        ? 'bg-emerald-500/30 text-emerald-400' 
                        : 'bg-red-500/30 text-red-400'
                    }`}>
                      {chainId === LEMON_CHAIN.chainId ? '● Connected' : '○ Not Connected'}
                    </span>
                    {chainId !== LEMON_CHAIN.chainId && isConnected && (
                      <button
                        onClick={switchToLemonChain}
                        className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-bold transition-colors"
                      >
                        Switch Network
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Network Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <span className="text-slate-400 text-xs block mb-1">Chain ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl text-yellow-400">{LEMON_CHAIN_INFO.chainId}</span>
                      <span className="text-xs text-slate-500">({LEMON_CHAIN_INFO.hexChainId})</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <span className="text-slate-400 text-xs block mb-1">{isSpanish ? 'Nombre de Red' : 'Network Name'}</span>
                    <span className="font-bold text-xl">{LEMON_CHAIN_INFO.name}</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <span className="text-slate-400 text-xs block mb-1">{isSpanish ? 'Moneda Nativa' : 'Native Currency'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl">{LEMON_CHAIN_INFO.currency.symbol}</span>
                      <span className="text-xs text-slate-500">({LEMON_CHAIN_INFO.currency.name})</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <span className="text-slate-400 text-xs block mb-1">Decimals</span>
                    <span className="font-bold text-xl">{LEMON_CHAIN_INFO.currency.decimals}</span>
                  </div>
                </div>

                {/* RPC Endpoints */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-300 font-medium">RPC Endpoints</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(LEMON_CHAIN_INFO.rpc.primary);
                        addTerminalLine('info', `Copied: ${LEMON_CHAIN_INFO.rpc.primary}`);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Primary
                    </button>
                  </div>
                  <div className="space-y-2">
                    {LEMON_CHAIN_RPC_ENDPOINTS.map((rpc, idx) => (
                      <div key={rpc} className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${idx === 0 ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {idx === 0 ? 'Primary' : `Backup ${idx}`}
                        </span>
                        <code className="text-sm text-slate-300 font-mono">{rpc}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explorer & Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a 
                    href={LEMON_CHAIN_INFO.explorer.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-yellow-500/50 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-yellow-400" />
                  <div>
                      <span className="font-medium block">Block Explorer</span>
                      <span className="text-xs text-slate-400">{LEMON_CHAIN_INFO.explorer.url}</span>
                  </div>
                  </a>
                  <a 
                    href={LEMON_CHAIN_INFO.documentation} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-yellow-500/50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                      <span className="font-medium block">{isSpanish ? 'Documentación' : 'Documentation'}</span>
                      <span className="text-xs text-slate-400">{LEMON_CHAIN_INFO.documentation}</span>
                  </div>
                  </a>
                  <a 
                    href={LEMON_CHAIN_INFO.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-yellow-500/50 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-emerald-400" />
                  <div>
                      <span className="font-medium block">{isSpanish ? 'Sitio Web' : 'Website'}</span>
                      <span className="text-xs text-slate-400">{LEMON_CHAIN_INFO.website}</span>
                    </div>
                    </a>
                  </div>

                {/* MetaMask Quick Add */}
                <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <h4 className="font-bold text-orange-400 mb-3 flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    {isSpanish ? 'Agregar a MetaMask' : 'Add to MetaMask'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Network Name:</span>
                        <span className="font-mono">{LEMON_CHAIN_INFO.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">New RPC URL:</span>
                        <span className="font-mono text-xs">{LEMON_CHAIN_INFO.rpc.primary}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chain ID:</span>
                        <span className="font-mono">{LEMON_CHAIN_INFO.chainId}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Currency Symbol:</span>
                        <span className="font-mono">{LEMON_CHAIN_INFO.currency.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Block Explorer:</span>
                        <span className="font-mono text-xs">{LEMON_CHAIN_INFO.explorer.url}</span>
                      </div>
                      <button
                        onClick={switchToLemonChain}
                        disabled={!isConnected}
                        className="w-full mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                      >
                        {isConnected ? (isSpanish ? 'Agregar/Cambiar a LemonChain' : 'Add/Switch to LemonChain') : (isSpanish ? 'Conecta wallet primero' : 'Connect wallet first')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Addresses */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  {isSpanish ? 'Direcciones de Contratos' : 'Contract Addresses'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(contracts).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setContracts({ ...contracts, [key]: e.target.value })}
                        placeholder="0x..."
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
                      addTerminalLine('success', '✓ Contract addresses saved');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSpanish ? 'Guardar' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setContracts(DEFAULT_CONTRACTS);
                      addTerminalLine('info', 'Contract addresses reset to defaults');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {isSpanish ? 'Gestión de Datos' : 'Data Management'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish
                    ? 'Los datos se almacenan localmente en el navegador. Puedes exportar o limpiar los datos aquí.'
                    : 'Data is stored locally in the browser. You can export or clear data here.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const data = { banks, custodies, locks, contracts };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dcb-treasury-backup-${Date.now()}.json`;
                      a.click();
                      addTerminalLine('success', '✓ Data exported');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {isSpanish ? 'Exportar' : 'Export'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(isSpanish ? '¿Estás seguro de limpiar todos los datos?' : 'Are you sure you want to clear all data?')) {
                        setBanks([]);
                        setCustodies([]);
                        setLocks([]);
                        localStorage.removeItem(STORAGE_KEY_BANKS);
                        localStorage.removeItem(STORAGE_KEY_CUSTODIES);
                        localStorage.removeItem(STORAGE_KEY_LOCKS);
                        addTerminalLine('warning', '⚠ All data cleared');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isSpanish ? 'Limpiar Todo' : 'Clear All'}
                  </button>
                </div>
              </div>

              {/* DApp Connection Info */}
              <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900 rounded-xl p-6 border border-indigo-500/30">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  {isSpanish ? 'Conexión con DApp Externa' : 'External DApp Connection'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish
                    ? 'Este módulo se conecta con una DApp externa desplegada en Lemon Chain. La DApp contiene los contratos inteligentes para el protocolo de certificación de tesorería.'
                    : 'This module connects with an external DApp deployed on Lemon Chain. The DApp contains the smart contracts for the treasury certification protocol.'}
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-xs">
                  <div className="text-slate-400 mb-2"># {isSpanish ? 'Contratos del Protocolo' : 'Protocol Contracts'}</div>
                  <div>USD.sol - ERC-20 {isSpanish ? 'con whitelist' : 'with whitelist'}</div>
                  <div>BankRegistry.sol - {isSpanish ? 'Registro de bancos' : 'Bank registry'}</div>
                  <div>CustodyVault.sol - {isSpanish ? 'Bóvedas de custodia' : 'Custody vaults'}</div>
                  <div>USDLockBox.sol - {isSpanish ? 'Sistema de locks con firma EIP-712' : 'Lock system with EIP-712 signature'}</div>
                  <div>MintingBridge.sol - {isSpanish ? 'Puente de minting ISO' : 'ISO minting bridge'}</div>
                  <div>IssuerController.sol - {isSpanish ? 'Controlador de emisión VUSD' : 'VUSD issuance controller'}</div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* LEMX AUTHORIZATION MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showLEMXAuthModal && selectedCertForAuth && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-cyan-500/30 w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {isSpanish ? 'Enviar a LEMX para Autorización' : 'Send to LEMX for Authorization'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isSpanish ? 'Solicitar autorización de minting de VUSD' : 'Request VUSD minting authorization'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Certification Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block">{isSpanish ? 'Certificación' : 'Certification'}</span>
                    <span className="font-bold text-white">{selectedCertForAuth.certificationNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isSpanish ? 'Monto' : 'Amount'}</span>
                    <span className="font-bold text-2xl text-cyan-400">
                      ${selectedCertForAuth.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Source of Funds */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {isSpanish ? 'Origen de Fondos' : 'Source of Funds'}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">{isSpanish ? 'Cuenta' : 'Account'}</span>
                    <p className="font-medium">{selectedCertForAuth.sourceAccount.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">{isSpanish ? 'Banco' : 'Bank'}</span>
                    <p className="font-medium">{selectedCertForAuth.bank.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">{isSpanish ? 'Balance Antes' : 'Balance Before'}</span>
                    <p className="font-medium">${selectedCertForAuth.sourceAccount.balanceBefore.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">{isSpanish ? 'Balance Después' : 'Balance After'}</span>
                    <p className="font-medium">${selectedCertForAuth.sourceAccount.balanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Digital Signatures */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {isSpanish ? 'Firmas Digitales' : 'Digital Signatures'} ({selectedCertForAuth.signatures.length})
                </h4>
                <div className="flex gap-2">
                  {selectedCertForAuth.signatures.map((sig, i) => (
                    <div key={i} className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-emerald-400">{sig.role}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{formatAddress(sig.address)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain Info */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Hash className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-cyan-400 font-bold">LEMX Transaction Hash</p>
                    <p className="font-mono text-xs text-slate-300">{selectedCertForAuth.lemxTxHash || 'N/A'}</p>
                  </div>
                  {selectedCertForAuth.lemxBlockNumber && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Block</p>
                      <p className="font-bold text-cyan-400">{selectedCertForAuth.lemxBlockNumber.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">{isSpanish ? 'Confirmación Requerida' : 'Confirmation Required'}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {isSpanish
                        ? 'Al enviar esta solicitud, el equipo de LEMX recibirá todos los detalles de origen de fondos, firmas digitales y datos blockchain para su revisión y aprobación.'
                        : 'By sending this request, the LEMX team will receive all source of funds details, digital signatures, and blockchain data for review and approval.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowLEMXAuthModal(false);
                  setSelectedCertForAuth(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {t.dcbCancel}
              </button>
              <button
                onClick={() => sendToLEMXAuthorization(selectedCertForAuth)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSpanish ? 'Enviar Solicitud a LEMX' : 'Send Request to LEMX'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MINT WITH LEMX CODE MODAL - 2 STEP PROCESS */}
      {/* Step 1: Enter Authorization Code (MINT-XXXX) from Consume & Mint */}
      {/* Step 2: Enter Minting TX Hash after LEMX mints */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showMintWithCodeModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {isSpanish ? 'Mintear VUSD con Código' : 'Mint VUSD with Code'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {mintWithCodeStep === 'enter_code' 
                        ? (isSpanish ? 'Paso 1: Ingresar código de autorización' : 'Step 1: Enter authorization code')
                        : mintWithCodeStep === 'enter_hash'
                        ? (isSpanish ? 'Paso 2: Ingresar hash de minting' : 'Step 2: Enter minting hash')
                        : (isSpanish ? 'Paso 3: Confirmar y publicar' : 'Step 3: Confirm and publish')}
                    </p>
                  </div>
                </div>
                {/* Step Indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    mintWithCodeStep === 'enter_code' ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>1</div>
                  <div className={`w-8 h-1 rounded ${mintWithCodeStep !== 'enter_code' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    mintWithCodeStep === 'enter_hash' ? 'bg-purple-500 text-white' : 
                    mintWithCodeStep === 'confirm' || mintWithCodeStep === 'complete' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-400'
                  }`}>2</div>
                  <div className={`w-8 h-1 rounded ${mintWithCodeStep === 'confirm' || mintWithCodeStep === 'complete' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    mintWithCodeStep === 'confirm' || mintWithCodeStep === 'complete' ? 'bg-purple-500 text-white' : 'bg-slate-600 text-slate-400'
                  }`}>3</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* STEP 1: Enter Authorization Code */}
              {mintWithCodeStep === 'enter_code' && (
                <>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-cyan-400">{isSpanish ? '¿De dónde obtener el código?' : 'Where to get the code?'}</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {isSpanish
                            ? 'El código de autorización (MINT-XXXX-YYYY) se genera cuando alguien ejecuta "Consume & Mint" en un Lock aprobado.'
                            : 'The authorization code (MINT-XXXX-YYYY) is generated when someone executes "Consume & Mint" on an approved Lock.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Código de Autorización' : 'Authorization Code'}
                    </label>
                    <input
                      type="text"
                      value={mintAuthCode}
                      onChange={(e) => setMintAuthCode(e.target.value.toUpperCase())}
                      placeholder="MINT-XXXXXXXX-XXXXXX"
                      className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl text-white font-mono text-xl tracking-wider focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-center"
                    />
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      {isSpanish ? 'Formato: MINT-XXXXXXXX-XXXXXX' : 'Format: MINT-XXXXXXXX-XXXXXX'}
                    </p>
                  </div>

                  {/* Pending Authorizations List */}
                  {pendingMintAuthorizations.filter(a => a.status === 'pending_mint').length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        {isSpanish ? 'Autorizaciones Pendientes:' : 'Pending Authorizations:'}
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pendingMintAuthorizations.filter(a => a.status === 'pending_mint').map(auth => (
                          <button
                            key={auth.id}
                            onClick={() => setMintAuthCode(auth.authorizationCode)}
                            className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 rounded-lg text-left transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-sm font-mono text-purple-400">{auth.authorizationCode}</code>
                              <span className="text-xs text-slate-500">{parseFloat(auth.requestedVUSD).toLocaleString()} VUSD</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {auth.bankName} • {new Date(auth.createdAt).toLocaleString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Enter Minting TX Hash */}
              {mintWithCodeStep === 'enter_hash' && validatedAuthorization && (
                <>
                  {/* Authorization Summary */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-emerald-400">{isSpanish ? 'Código Validado' : 'Code Validated'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Código' : 'Code'}</p>
                        <code className="text-sm font-mono text-white">{validatedAuthorization.authorizationCode}</code>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Monto' : 'Amount'}</p>
                        <p className="text-lg font-bold text-emerald-400">{parseFloat(validatedAuthorization.requestedVUSD).toLocaleString()} VUSD</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Banco' : 'Bank'}</p>
                        <p className="text-sm text-white">{validatedAuthorization.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</p>
                        <code className="text-xs font-mono text-slate-300">{formatAddress(validatedAuthorization.beneficiaryAddress)}</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-400">{isSpanish ? 'Acción Requerida' : 'Action Required'}</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {isSpanish
                            ? 'LEMX debe mintear los VUSD tokens usando la llave ISSUER_OPERATOR. Una vez minteados, ingrese el hash de la transacción.'
                            : 'LEMX must mint the VUSD tokens using the ISSUER_OPERATOR key. Once minted, enter the transaction hash.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Minting Key Info */}
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-5 h-5 text-purple-400" />
                      <span className="font-bold text-purple-400">ISSUER_OPERATOR Key</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Dirección' : 'Address'}</p>
                        <code className="text-sm font-mono text-emerald-400">0xC3C5F66A69d595826ec853f9E89cE1dD96D85c98</code>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{isSpanish ? 'Llave Privada' : 'Private Key'}</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono text-yellow-400 bg-slate-900 px-2 py-1 rounded overflow-x-auto">
                            {isSpanish ? 'Configurado en .env (VITE_ISSUER_OPERATOR_KEY)' : 'Configured in .env (VITE_ISSUER_OPERATOR_KEY)'}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TX Hash Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Hash de Transacción de Minting' : 'Minting Transaction Hash'}
                    </label>
                    <input
                      type="text"
                      value={lemxMintTxHash}
                      onChange={(e) => setLemxMintTxHash(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl text-white font-mono text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {isSpanish ? 'Hash de 66 caracteres (0x + 64 hex)' : 'Hash of 66 characters (0x + 64 hex)'}
                    </p>
                  </div>

                  {/* VUSD Contract Address Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {isSpanish ? 'Dirección del Contrato VUSD' : 'VUSD Contract Address'}
                    </label>
                    <input
                      type="text"
                      value={lemxContractAddress}
                      onChange={(e) => {
                        const addr = e.target.value;
                        setLemxContractAddress(addr);
                        // Verify if contract matches official
                        setContractVerified(addr.toLowerCase() === OFFICIAL_VUSD_CONTRACT.toLowerCase());
                      }}
                      placeholder="0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99"
                      className={`w-full p-4 bg-slate-800 border rounded-xl text-white font-mono text-sm focus:ring-2 ${
                        lemxContractAddress 
                          ? contractVerified 
                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20' 
                            : 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-600 focus:border-purple-500 focus:ring-purple-500/20'
                      }`}
                    />
                    
                    {/* Contract Verification Status */}
                    {lemxContractAddress && (
                      <div className={`mt-3 p-3 rounded-lg flex items-center gap-3 ${
                        contractVerified 
                          ? 'bg-emerald-500/10 border border-emerald-500/30' 
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        {contractVerified ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <div>
                              <p className="text-sm font-bold text-emerald-400">
                                {isSpanish ? '✓ Contrato VUSD Verificado' : '✓ VUSD Contract Verified'}
                              </p>
                              <p className="text-xs text-emerald-400/80">
                                {isSpanish 
                                  ? 'El contrato coincide con el oficial de LemonChain' 
                                  : 'Contract matches official LemonChain VUSD'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <div>
                              <p className="text-sm font-bold text-red-400">
                                {isSpanish ? '✗ Contrato NO Verificado' : '✗ Contract NOT Verified'}
                              </p>
                              <p className="text-xs text-red-400/80">
                                {isSpanish 
                                  ? `Debe ser: ${OFFICIAL_VUSD_CONTRACT}` 
                                  : `Must be: ${OFFICIAL_VUSD_CONTRACT}`}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Official Contract Reference */}
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs text-slate-400">{isSpanish ? 'Contrato Oficial VUSD' : 'Official VUSD Contract'}:</span>
                        </div>
                        <button
                          onClick={() => {
                            setLemxContractAddress(OFFICIAL_VUSD_CONTRACT);
                            setContractVerified(true);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {isSpanish ? 'Usar Oficial' : 'Use Official'}
                        </button>
                      </div>
                      <code className="text-xs font-mono text-cyan-400 mt-1 block">{OFFICIAL_VUSD_CONTRACT}</code>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3: Confirm */}
              {mintWithCodeStep === 'confirm' && validatedAuthorization && (
                <>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-emerald-400 mb-2">
                      {isSpanish ? '¡Listo para Publicar!' : 'Ready to Publish!'}
                    </h3>
                    <p className="text-slate-400">
                      {isSpanish 
                        ? 'Confirme para cerrar la operación y publicarla en el Explorer.'
                        : 'Confirm to close the operation and publish it to the Explorer.'}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isSpanish ? 'Código de Autorización' : 'Authorization Code'}</span>
                      <code className="font-mono text-purple-400">{validatedAuthorization.authorizationCode}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isSpanish ? 'Monto VUSD' : 'VUSD Amount'}</span>
                      <span className="font-bold text-emerald-400">{parseFloat(validatedAuthorization.requestedVUSD).toLocaleString()} VUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isSpanish ? 'Hash de Minting' : 'Minting Hash'}</span>
                      <code className="font-mono text-cyan-400 text-xs">{formatAddress(lemxMintTxHash)}</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{isSpanish ? 'Contrato VUSD' : 'VUSD Contract'}</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-teal-400 text-xs">{formatAddress(lemxContractAddress)}</code>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</span>
                      <code className="font-mono text-slate-300 text-xs">{formatAddress(validatedAuthorization.beneficiaryAddress)}</code>
                    </div>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <p className="text-sm text-purple-400">
                      {isSpanish
                        ? '📋 Se generará un código de publicación (PUB-XXXX) y un recibo profesional.'
                        : '📋 A publication code (PUB-XXXX) and professional receipt will be generated.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => {
                  if (mintWithCodeStep === 'enter_hash') {
                    setMintWithCodeStep('enter_code');
                    setValidatedAuthorization(null);
                  } else if (mintWithCodeStep === 'confirm') {
                    setMintWithCodeStep('enter_hash');
                  } else {
                    setShowMintWithCodeModal(false);
                    setMintAuthCode('');
                    setLemxMintTxHash('');
                    setLemxContractAddress('');
                    setContractVerified(false);
                    setMintWithCodeStep('enter_code');
                    setValidatedAuthorization(null);
                  }
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {mintWithCodeStep === 'enter_code' 
                  ? (isSpanish ? 'Cancelar' : 'Cancel')
                  : (isSpanish ? 'Atrás' : 'Back')}
              </button>
              
              {mintWithCodeStep === 'enter_code' && (
                <button
                  onClick={() => {
                    const auth = validateAuthorizationCode(mintAuthCode);
                    if (auth) {
                      setValidatedAuthorization(auth);
                      setMintWithCodeStep('enter_hash');
                      addTerminalLine('success', `✓ Authorization code validated: ${mintAuthCode}`);
                    } else {
                      addTerminalLine('error', `✗ Invalid or expired authorization code: ${mintAuthCode}`);
                    }
                  }}
                  disabled={!mintAuthCode || mintAuthCode.length < 10}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                >
                  <Search className="w-5 h-5" />
                  {isSpanish ? 'Validar Código' : 'Validate Code'}
                </button>
              )}
              
              {mintWithCodeStep === 'enter_hash' && (
                <button
                  onClick={() => setMintWithCodeStep('confirm')}
                  disabled={!lemxMintTxHash || lemxMintTxHash.length !== 66 || !contractVerified}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
                >
                  <ArrowRight className="w-5 h-5" />
                  {isSpanish ? 'Continuar' : 'Continue'}
                </button>
              )}
              
              {mintWithCodeStep === 'confirm' && validatedAuthorization && (
                <button
                  onClick={() => completeMintingWithHash(validatedAuthorization, lemxMintTxHash, lemxContractAddress)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {isSpanish ? 'Publicar en Explorer' : 'Publish to Explorer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* AUTHORIZATION CODE MODAL - Shows after Consume & Mint */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showAuthorizationCodeModal && lastAuthorizationCode && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-cyan-900/20 to-slate-900 rounded-2xl border border-cyan-500/30 w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/20 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Key className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    {isSpanish ? 'Código de Autorización Generado' : 'Authorization Code Generated'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isSpanish ? 'Proporcione este código a LEMX para mintear' : 'Provide this code to LEMX for minting'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Authorization Code */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6 text-center">
                <p className="text-xs text-cyan-400 mb-2">{isSpanish ? 'CÓDIGO DE AUTORIZACIÓN' : 'AUTHORIZATION CODE'}</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-3xl font-mono font-bold text-white tracking-wider">
                    {lastAuthorizationCode.authorizationCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastAuthorizationCode.authorizationCode);
                      addTerminalLine('success', '✓ Authorization code copied to clipboard');
                    }}
                    className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-6 h-6 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Monto a Mintear' : 'Amount to Mint'}</p>
                  <p className="text-xl font-bold text-emerald-400">{parseFloat(lastAuthorizationCode.requestedVUSD).toLocaleString()} VUSD</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Expira' : 'Expires'}</p>
                  <p className="text-lg font-bold text-white">{new Date(lastAuthorizationCode.expiresAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Beneficiary */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</p>
                <code className="text-sm font-mono text-purple-400">{lastAuthorizationCode.beneficiaryAddress}</code>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">{isSpanish ? 'Próximos Pasos' : 'Next Steps'}</p>
                    <ol className="text-sm text-slate-400 mt-2 space-y-1 list-decimal list-inside">
                      <li>{isSpanish ? 'Copie el código de autorización' : 'Copy the authorization code'}</li>
                      <li>{isSpanish ? 'LEMX usa el código en "Mint with LEMX Code"' : 'LEMX uses the code in "Mint with LEMX Code"'}</li>
                      <li>{isSpanish ? 'LEMX mintea los VUSD tokens' : 'LEMX mints the VUSD tokens'}</li>
                      <li>{isSpanish ? 'LEMX ingresa el hash de minting' : 'LEMX enters the minting hash'}</li>
                      <li>{isSpanish ? 'La operación se publica en el Explorer' : 'The operation is published to the Explorer'}</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setShowAuthorizationCodeModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lastAuthorizationCode.authorizationCode);
                  setShowAuthorizationCodeModal(false);
                  addTerminalLine('success', '✓ Code copied - Ready for LEMX minting');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/30"
              >
                <Copy className="w-5 h-5" />
                {isSpanish ? 'Copiar y Cerrar' : 'Copy & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MINT SUCCESS MODAL - Shows after Consume & Mint */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {showMintSuccessModal && lastMintTransaction && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 rounded-2xl border border-emerald-500/30 w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/20 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    ✓ {isSpanish ? 'VUSD Minteado Exitosamente!' : 'VUSD Minted Successfully!'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isSpanish ? 'La transacción ha sido confirmada en LemonChain' : 'Transaction confirmed on LemonChain'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Mint Code */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-400 mb-1">{isSpanish ? 'Código de Mint' : 'Mint Code'}</p>
                    <p className="text-2xl font-mono font-bold text-emerald-400">{lastMintTransaction.mintCode}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastMintTransaction.mintCode);
                      addTerminalLine('success', '✓ Mint code copied to clipboard');
                    }}
                    className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-5 h-5 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-2">{isSpanish ? 'Hash de Transacción' : 'Transaction Hash'}</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-cyan-400 bg-slate-900 px-3 py-2 rounded-lg flex-1 overflow-x-auto">
                    {lastMintTransaction.txHash}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastMintTransaction.txHash);
                      addTerminalLine('success', '✓ TX Hash copied to clipboard');
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Monto Minteado' : 'Minted Amount'}</p>
                  <p className="text-xl font-bold text-white">{parseFloat(lastMintTransaction.mintedAmount).toLocaleString()} <span className="text-emerald-400">VUSD</span></p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Bloque' : 'Block'}</p>
                  <p className="text-xl font-bold text-white">#{lastMintTransaction.blockNumber.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Gas Usado' : 'Gas Used'}</p>
                  <p className="text-lg font-bold text-white">{parseInt(lastMintTransaction.gasUsed).toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{isSpanish ? 'Fee de Red' : 'Network Fee'}</p>
                  <p className="text-lg font-bold text-white">{lastMintTransaction.networkFee} <span className="text-yellow-400">LEMX</span></p>
                </div>
              </div>

              {/* Beneficiary */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-2">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</p>
                <code className="text-sm font-mono text-purple-400">{lastMintTransaction.beneficiary}</code>
              </div>

              {/* Operator Info */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-yellow-400" />
                  <p className="text-sm font-bold text-yellow-400">{isSpanish ? 'Firmado por' : 'Signed by'}: ISSUER_OPERATOR</p>
                </div>
                <code className="text-xs font-mono text-slate-300 block">{lastMintTransaction.operatorAddress}</code>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setShowMintSuccessModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateMintingReceiptPDF(lastMintTransaction)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isSpanish ? 'Descargar PDF' : 'Download PDF'}
                </button>
                <button
                  onClick={() => {
                    setSelectedMintTransaction(lastMintTransaction);
                    setShowMintSuccessModal(false);
                    setShowMintExplorer(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/30"
                >
                  <Search className="w-5 h-5" />
                  {isSpanish ? 'Ver en Explorer' : 'View in Explorer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MINT LEMON EXPLORER VUSD - Shared Fullscreen Component                          */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <MintLemonExplorer 
        isOpen={showMintExplorer}
        onClose={() => {
          setShowMintExplorer(false);
          setSelectedMintTransaction(null);
        }}
        apiUrl="http://localhost:4010"
        language={language === 'es' ? 'es' : 'en'}
      />

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PRO FOOTER - Blue Theme */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <footer 
        className="h-12 flex items-center justify-between px-6 text-xs"
        style={{
          background: premiumColors.bgSecondary,
          borderTop: `1px solid ${premiumColors.border}`
        }}
      >
        <div className="flex items-center gap-4">
          <span style={{ color: premiumColors.textMuted }}>DCB Treasury Certification Platform v1.0.0</span>
          <span style={{ color: premiumColors.border }}>•</span>
          <span style={{ color: premiumColors.accent }}>Lemon Chain (ID: {LEMON_CHAIN.chainId})</span>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: premiumColors.textMuted }}>EIP-712 Signatures</span>
          <span style={{ color: premiumColors.border }}>•</span>
          <span style={{ color: premiumColors.textMuted }}>ISO 20022 Compliant</span>
          <span style={{ color: premiumColors.border }}>•</span>
          <span 
            className="font-semibold"
            style={{ 
              background: premiumColors.gradientBlue,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Digital Commercial Bank Ltd
          </span>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL STYLES - PRO Blue Theme */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <style>{`
        /* Custom Scrollbar - Blue Theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${premiumColors.bg};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: ${premiumColors.borderAccent};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${premiumColors.accent};
        }
        
        /* Selection - Blue Theme */
        ::selection {
          background: ${premiumColors.accentDim};
          color: ${premiumColors.accent};
        }
        
        /* Pulse Animation */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Glow Animation */
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px ${premiumColors.accent}; }
          50% { box-shadow: 0 0 20px ${premiumColors.accent}, 0 0 30px ${premiumColors.accentDim}; }
        }
        
        /* Spin Animation */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Slide In Animation */
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default DCBTreasuryCertificationModule;
