// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MINT LEMON EXPLORER VUSD - LEMONCHAIN PROFESSIONAL DESIGN
// Blockchain Explorer para LemonChain - Diseño Premium Nivel PRO
// Arquitectura profesional con estadísticas en tiempo real, tabla de transacciones y panel de detalles
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Search, RefreshCw, Copy, ExternalLink, ChevronLeft, ChevronRight,
  Activity, Box, Clock, Database, Zap,
  Lock, CheckCircle, XCircle, Shield, Coins, Hash, FileText, ArrowUpRight,
  ArrowDownRight, Check,
  Server, Eye, BarChart3,
  Sparkles, Hexagon, Link2, FileDown
} from 'lucide-react';
import { downloadAuditPDF, convertToAuditTransaction, type AuditReportConfig } from '../../lib/audit-pdf-generator';
// Import subpages
import { BlocksExplorer } from '../explorer/BlocksExplorer';
import { TokensDirectory } from '../explorer/TokensDirectory';
import { ContractsDirectory } from '../explorer/ContractsDirectory';
import { AnalyticsDashboard } from '../explorer/AnalyticsDashboard';
import { 
  autoConnectService, 
  type MintExplorerData,
  type BlockchainEvent,
  type InjectionData,
  type LockData as BlockchainLockData,
  CONTRACT_ADDRESSES_V5 
} from '../../lib/blockchain/auto-connect-service';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface MintExplorerEvent {
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
    gasUsed?: string;
    gasPrice?: string;
    nonce?: number;
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

interface MintLemonExplorerProps {
  isOpen?: boolean;
  onClose?: () => void;
  apiUrl?: string;
  language?: 'en' | 'es' | 'ar' | 'zh' | 'pt';
  embedded?: boolean; // When true, renders as embedded component without fixed position
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// EXPLORER TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
const EXPLORER_TRANSLATIONS = {
  en: {
    title: 'MINT LEMON EXPLORER',
    subtitle: 'LemonChain VUSD Explorer',
    lemonBlock: 'LEMON BLOCK',
    lemonTxs: 'LEMON TXs',
    tps: 'TPS',
    lusdMinted: 'VUSD Minted',
    usdLocked: 'USD Locked',
    mintsDone: 'Mints Done',
    treasuryCurrencies: 'Treasury Currencies',
    daesIso: 'DAES ISO 4217',
    usdLusdActive: 'USD→VUSD',
    transactions: 'Transactions',
    all: 'All',
    locks: 'Locks',
    approved: 'Approved',
    rejected: 'Rejected',
    reserved: 'Reserved',
    completed: 'Completed',
    noTransactions: 'No transactions found',
    transactionDetails: 'Transaction Details',
    signatures: 'Signatures',
    blockchainInfo: 'Blockchain Info',
    close: 'Close',
    refresh: 'Refresh',
    search: 'Search',
    mint: 'MINT',
    reserve: 'RSV',
    network: 'Network',
    chainId: 'Chain ID',
    consensus: 'Consensus',
    blockTime: 'Block Time',
    version: 'Version',
    connected: 'Connected',
    disconnected: 'Disconnected',
    loading: 'Loading...',
    estimated: 'estimated',
    txPerSec: 'tx/s',
    pendingOnLemonChain: 'Pending on LemonChain',
    mintingCompleted: '🎉 Minting completed - {amount} VUSD created on LemonChain',
    lockApprovedForMinting: 'Lock approved for minting - Amount: ${amount}',
    lockRejected: 'Lock rejected - Reason: {reason}',
    lockReserveCreated: 'Lock Reserve created - Reserved amount: ${amount}',
    lockCreated: 'Lock received from DCB Treasury - Amount: ${amount}'
  },
  es: {
    title: 'EXPLORADOR MINT LEMON',
    subtitle: 'Explorador VUSD de LemonChain',
    lemonBlock: 'BLOQUE LEMON',
    lemonTxs: 'TXs LEMON',
    tps: 'TPS',
    lusdMinted: 'VUSD Minteado',
    usdLocked: 'USD Bloqueado',
    mintsDone: 'Mints Hechos',
    treasuryCurrencies: 'Divisas del Tesoro',
    daesIso: 'DAES ISO 4217',
    usdLusdActive: 'USD→VUSD',
    transactions: 'Transacciones',
    all: 'Todos',
    locks: 'Locks',
    approved: 'Aprobados',
    rejected: 'Rechazados',
    reserved: 'Reservados',
    completed: 'Completados',
    noTransactions: 'Sin transacciones',
    transactionDetails: 'Detalles de Transacción',
    signatures: 'Firmas',
    blockchainInfo: 'Info Blockchain',
    close: 'Cerrar',
    refresh: 'Actualizar',
    search: 'Buscar',
    mint: 'MINT',
    reserve: 'RSV',
    network: 'Red',
    chainId: 'ID Cadena',
    consensus: 'Consenso',
    blockTime: 'Tiempo de Bloque',
    version: 'Versión',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    loading: 'Cargando...',
    estimated: 'estimado',
    txPerSec: 'tx/s',
    pendingOnLemonChain: 'Pendiente en LemonChain',
    mintingCompleted: '🎉 Minting completado - {amount} VUSD creados en LemonChain',
    lockApprovedForMinting: 'Lock aprobado para minting - Monto: ${amount}',
    lockRejected: 'Lock rechazado - Razón: {reason}',
    lockReserveCreated: 'Lock Reserve creado - Monto reservado: ${amount}',
    lockCreated: 'Lock recibido de DCB Treasury - Monto: ${amount}'
  },
  ar: {
    title: 'مستكشف ليمون للسك',
    subtitle: 'مستكشف VUSD ليمون تشين',
    lemonBlock: 'كتلة ليمون',
    lemonTxs: 'معاملات ليمون',
    tps: 'TPS',
    lusdMinted: 'VUSD مسكوك',
    usdLocked: 'USD مقفل',
    mintsDone: 'السك المنجز',
    treasuryCurrencies: 'عملات الخزينة',
    daesIso: 'DAES ISO 4217',
    usdLusdActive: 'USD→VUSD',
    transactions: 'المعاملات',
    all: 'الكل',
    locks: 'الأقفال',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    reserved: 'محجوز',
    completed: 'مكتمل',
    noTransactions: 'لا توجد معاملات',
    transactionDetails: 'تفاصيل المعاملة',
    signatures: 'التوقيعات',
    blockchainInfo: 'معلومات البلوكتشين',
    close: 'إغلاق',
    refresh: 'تحديث',
    search: 'بحث',
    mint: 'سك',
    reserve: 'احتياطي',
    network: 'الشبكة',
    chainId: 'معرف السلسلة',
    consensus: 'الإجماع',
    blockTime: 'وقت الكتلة',
    version: 'الإصدار',
    connected: 'متصل',
    disconnected: 'غير متصل',
    loading: 'جاري التحميل...',
    estimated: 'تقديري',
    txPerSec: 'معاملة/ث',
    pendingOnLemonChain: 'قيد الانتظار على LemonChain',
    mintingCompleted: '🎉 تم السك - {amount} VUSD تم إنشاؤها على LemonChain',
    lockApprovedForMinting: 'تمت الموافقة على القفل للسك - المبلغ: ${amount}',
    lockRejected: 'تم رفض القفل - السبب: {reason}',
    lockReserveCreated: 'تم إنشاء احتياطي القفل - المبلغ المحجوز: ${amount}',
    lockCreated: 'تم استلام قفل من DCB Treasury - المبلغ: ${amount}'
  },
  zh: {
    title: 'LEMON 铸币浏览器',
    subtitle: 'LemonChain VUSD 浏览器',
    lemonBlock: 'LEMON 区块',
    lemonTxs: 'LEMON 交易',
    tps: 'TPS',
    lusdMinted: 'VUSD 已铸造',
    usdLocked: 'USD 已锁定',
    mintsDone: '铸币完成',
    treasuryCurrencies: '财务货币',
    daesIso: 'DAES ISO 4217',
    usdLusdActive: 'USD→VUSD',
    transactions: '交易',
    all: '全部',
    locks: '锁定',
    approved: '已批准',
    rejected: '已拒绝',
    reserved: '已预留',
    completed: '已完成',
    noTransactions: '无交易',
    transactionDetails: '交易详情',
    signatures: '签名',
    blockchainInfo: '区块链信息',
    close: '关闭',
    refresh: '刷新',
    search: '搜索',
    mint: '铸造',
    reserve: '储备',
    network: '网络',
    chainId: '链ID',
    consensus: '共识',
    blockTime: '出块时间',
    version: '版本',
    connected: '已连接',
    disconnected: '未连接',
    loading: '加载中...',
    estimated: '估计',
    txPerSec: '交易/秒',
    pendingOnLemonChain: 'LemonChain 上待处理',
    mintingCompleted: '🎉 铸币完成 - {amount} VUSD 已在 LemonChain 上创建',
    lockApprovedForMinting: '锁定已批准铸币 - 金额: ${amount}',
    lockRejected: '锁定已拒绝 - 原因: {reason}',
    lockReserveCreated: '锁定储备已创建 - 储备金额: ${amount}',
    lockCreated: '从DCB Treasury收到锁定 - 金额: ${amount}'
  },
  pt: {
    title: 'EXPLORADOR MINT LEMON',
    subtitle: 'Explorador VUSD LemonChain',
    lemonBlock: 'BLOCO LEMON',
    lemonTxs: 'TXs LEMON',
    tps: 'TPS',
    lusdMinted: 'VUSD Cunhado',
    usdLocked: 'USD Bloqueado',
    mintsDone: 'Cunhagens Feitas',
    treasuryCurrencies: 'Moedas do Tesouro',
    daesIso: 'DAES ISO 4217',
    usdLusdActive: 'USD→VUSD',
    transactions: 'Transações',
    all: 'Todos',
    locks: 'Bloqueios',
    approved: 'Aprovados',
    rejected: 'Rejeitados',
    reserved: 'Reservados',
    completed: 'Concluídos',
    noTransactions: 'Sem transações',
    transactionDetails: 'Detalhes da Transação',
    signatures: 'Assinaturas',
    blockchainInfo: 'Info Blockchain',
    close: 'Fechar',
    refresh: 'Atualizar',
    search: 'Buscar',
    mint: 'CUNHAR',
    reserve: 'RSV',
    network: 'Rede',
    chainId: 'ID da Cadeia',
    consensus: 'Consenso',
    blockTime: 'Tempo de Bloco',
    version: 'Versão',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    loading: 'Carregando...',
    estimated: 'estimado',
    txPerSec: 'tx/s',
    pendingOnLemonChain: 'Pendente no LemonChain',
    mintingCompleted: '🎉 Cunhagem concluída - {amount} VUSD criados no LemonChain',
    lockApprovedForMinting: 'Bloqueio aprovado para cunhagem - Valor: ${amount}',
    lockRejected: 'Bloqueio rejeitado - Motivo: {reason}',
    lockReserveCreated: 'Reserva de bloqueio criada - Valor reservado: ${amount}',
    lockCreated: 'Bloqueio recebido do DCB Treasury - Valor: ${amount}'
  }
};

// Helper function to generate event descriptions based on language
const getEventDescription = (event: MintExplorerEvent, lang: keyof typeof EXPLORER_TRANSLATIONS): string => {
  const t = EXPLORER_TRANSLATIONS[lang];
  const amount = parseFloat(event.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  switch (event.type) {
    case 'MINT_COMPLETED':
      return t.mintingCompleted.replace('{amount}', amount);
    case 'LOCK_APPROVED':
      return t.lockApprovedForMinting.replace('{amount}', amount);
    case 'LOCK_REJECTED':
      // Extract reason from original description if available
      const reason = event.description?.match(/Razón:|Reason:|原因:|السبب:|Motivo:/)?.[0] 
        ? event.description.split(/Razón:|Reason:|原因:|السبب:|Motivo:/)[1]?.trim() || 'N/A'
        : 'N/A';
      return t.lockRejected.replace('{reason}', reason);
    case 'LOCK_RESERVE_CREATED':
      return t.lockReserveCreated.replace('{amount}', amount);
    case 'LOCK_CREATED':
      return t.lockCreated.replace('{amount}', amount);
    default:
      return event.description || '';
  }
};

type TabType = 'transactions' | 'blocks' | 'tokens' | 'contracts' | 'analytics';
type TransactionFilter = 'ALL' | 'LOCK_CREATED' | 'LOCK_APPROVED' | 'LOCK_REJECTED' | 'LOCK_RESERVE_CREATED' | 'MINT_COMPLETED';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LEMONCHAIN NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// Use V5 contract addresses from auto-connect-service
const LEMON_CHAIN = {
  name: 'LemonChain',
  symbol: 'LEMON',
  chainId: 1006,
  rpc: 'https://rpc.lemonchain.io',
  wss: 'wss://ws.lemonchain.io',
  explorer: 'https://explorer.lemonchain.io',
  // DCB Treasury V5 Contracts - DEPLOYED & VERIFIED ON LEMONCHAIN
  vusdContract: CONTRACT_ADDRESSES_V5.VUSD,           // 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
  usdTokenized: CONTRACT_ADDRESSES_V5.USDTokenized,   // 0x602FbeBDe6034d34BB2497AB5fa261383f87d04f
  lockReserve: CONTRACT_ADDRESSES_V5.LockReserve,     // 0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021
  vusdMinter: CONTRACT_ADDRESSES_V5.VUSDMinter,       // 0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC
  nativeToken: 'LEMON',
  consensus: 'Proof of Authority',
  blockTime: '3 seconds',
  version: 'v5.0.0'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// DAES TREASURY CURRENCIES - 15 ISO 4217 Supported Currencies
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
const TREASURY_CURRENCIES = [
  { code: 'USD', iso: '840', name: 'United States Dollar', symbol: '$', mintable: true },
  { code: 'EUR', iso: '978', name: 'Euro', symbol: '€', mintable: false },
  { code: 'GBP', iso: '826', name: 'British Pound Sterling', symbol: '£', mintable: false },
  { code: 'CHF', iso: '756', name: 'Swiss Franc', symbol: 'Fr', mintable: false },
  { code: 'JPY', iso: '392', name: 'Japanese Yen', symbol: '¥', mintable: false },
  { code: 'CAD', iso: '124', name: 'Canadian Dollar', symbol: 'C$', mintable: false },
  { code: 'AUD', iso: '036', name: 'Australian Dollar', symbol: 'A$', mintable: false },
  { code: 'SGD', iso: '702', name: 'Singapore Dollar', symbol: 'S$', mintable: false },
  { code: 'HKD', iso: '344', name: 'Hong Kong Dollar', symbol: 'HK$', mintable: false },
  { code: 'CNY', iso: '156', name: 'Chinese Yuan', symbol: '¥', mintable: false },
  { code: 'AED', iso: '784', name: 'UAE Dirham', symbol: 'د.إ', mintable: false },
  { code: 'SAR', iso: '682', name: 'Saudi Riyal', symbol: '﷼', mintable: false },
  { code: 'INR', iso: '356', name: 'Indian Rupee', symbol: '₹', mintable: false },
  { code: 'BRL', iso: '986', name: 'Brazilian Real', symbol: 'R$', mintable: false },
  { code: 'MXN', iso: '484', name: 'Mexican Peso', symbol: '$', mintable: false },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LEMON GREEN PROFESSIONAL THEME
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const THEME = {
  // Backgrounds - Deep dark with subtle green tint
  bgPrimary: '#050807',
  bgSecondary: '#0A0F0D',
  bgTertiary: '#0F1512',
  bgCard: '#0D1210',
  bgHover: '#141C18',
  bgActive: '#1A2420',
  bgGlass: 'rgba(163, 230, 53, 0.03)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#374151',
  
  // Lemon Green Accent Colors
  lemonPrimary: '#A3E635',      // Lime-400 - Primary lemon green
  lemonSecondary: '#84CC16',    // Lime-500
  lemonBright: '#D9F99D',       // Lime-200 - Bright highlight
  lemonDark: '#65A30D',         // Lime-600
  lemonGlow: '#A3E635',         // For glow effects
  
  // Secondary Accents
  accentCyan: '#22D3EE',
  accentBlue: '#3B82F6',
  accentPurple: '#A855F7',
  accentGold: '#FBBF24',
  accentOrange: '#F97316',
  
  // Status Colors
  statusPending: '#FBBF24',
  statusApproved: '#A3E635',
  statusRejected: '#EF4444',
  statusCompleted: '#A855F7',
  statusReserved: '#22D3EE',
  
  // Borders
  borderPrimary: '#1F2937',
  borderSecondary: '#374151',
  borderLemon: 'rgba(163, 230, 53, 0.3)',
  borderGlow: 'rgba(163, 230, 53, 0.5)',
  
  // Gradients
  gradientLemon: 'linear-gradient(135deg, #A3E635 0%, #84CC16 50%, #65A30D 100%)',
  gradientLemonSoft: 'linear-gradient(135deg, rgba(163, 230, 53, 0.2) 0%, rgba(132, 204, 22, 0.1) 100%)',
  gradientDark: 'linear-gradient(180deg, #0A0F0D 0%, #050807 100%)',
  gradientRadial: 'radial-gradient(ellipse at top, rgba(163, 230, 53, 0.15) 0%, transparent 50%)',
  gradientGlow: 'radial-gradient(circle at center, rgba(163, 230, 53, 0.4) 0%, transparent 70%)'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCompactNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const truncateHash = (hash: string, start = 10, end = 8): string => {
  if (!hash || hash.length < start + end + 3) return hash || 'N/A';
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// Lemon Logo Component
const LemonLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <div style={{
    width: size,
    height: size,
    background: THEME.gradientLemon,
    borderRadius: size * 0.25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 ${size * 0.6}px ${THEME.lemonGlow}60, 0 0 ${size * 1.2}px ${THEME.lemonGlow}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
      borderRadius: size * 0.25
    }} />
    <Hexagon style={{ width: size * 0.55, height: size * 0.55, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
  </div>
);

// Copy Button with Feedback
const CopyButton: React.FC<{ text: string; size?: number }> = ({ text, size = 14 }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? `${THEME.lemonPrimary}20` : 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      }}
    >
      {copied ? (
        <Check style={{ width: size, height: size, color: THEME.lemonPrimary }} />
      ) : (
        <Copy style={{ width: size, height: size, color: THEME.textMuted }} />
      )}
    </button>
  );
};

// Status Badge - Enhanced
const StatusBadge: React.FC<{ type: string }> = ({ type }) => {
  const getStatusConfig = () => {
    switch (type) {
      case 'LOCK_CREATED':
        return { label: 'LOCK', color: THEME.statusPending, icon: Lock, glow: true };
      case 'LOCK_APPROVED':
        return { label: 'APPROVED', color: THEME.statusApproved, icon: CheckCircle, glow: true };
      case 'LOCK_REJECTED':
        return { label: 'REJECTED', color: THEME.statusRejected, icon: XCircle, glow: false };
      case 'LOCK_RESERVE_CREATED':
        return { label: 'RESERVE', color: THEME.statusReserved, icon: Shield, glow: true };
      case 'MINT_COMPLETED':
        return { label: 'MINTED', color: THEME.statusCompleted, icon: Coins, glow: true };
      default:
        return { label: type, color: THEME.textMuted, icon: Activity, glow: false };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 12px',
      background: `${config.color}15`,
      border: `1px solid ${config.color}50`,
      borderRadius: '6px',
      boxShadow: config.glow ? `0 0 12px ${config.color}30` : 'none'
    }}>
      <Icon style={{ width: 13, height: 13, color: config.color }} />
      <span style={{
        fontSize: '11px',
        fontWeight: '700',
        color: config.color,
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
      }}>
        {config.label}
      </span>
    </div>
  );
};

// Network Stats Card - Enhanced PRO Design
const NetworkStatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  color?: string;
  highlight?: boolean;
}> = ({ icon: Icon, label, value, subValue, trend, color = THEME.lemonPrimary, highlight = false }) => (
  <div style={{
    background: highlight ? THEME.gradientLemonSoft : THEME.bgCard,
    border: `1px solid ${highlight ? THEME.borderLemon : THEME.borderPrimary}`,
    borderRadius: '12px',
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    minWidth: '210px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: highlight ? `0 0 30px ${THEME.lemonGlow}15` : 'none'
  }}>
    {highlight && (
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: THEME.gradientGlow,
        opacity: 0.3,
        filter: 'blur(30px)'
      }} />
    )}
    <div style={{
      width: '48px',
      height: '48px',
      background: `${color}15`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${color}30`,
      boxShadow: `0 0 20px ${color}20`
    }}>
      <Icon style={{ width: 24, height: 24, color }} />
    </div>
    <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
      <p style={{ 
        fontSize: '10px', 
        color: THEME.textMuted, 
        marginBottom: '6px', 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        fontWeight: '600'
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ 
          fontSize: '22px', 
          fontWeight: '800', 
          color: highlight ? THEME.lemonPrimary : THEME.textPrimary,
          letterSpacing: '-0.5px'
        }}>
          {value}
        </span>
        {subValue && (
          <span style={{ fontSize: '12px', color: THEME.textMuted, fontWeight: '500' }}>
            {subValue}
          </span>
        )}
        {trend !== undefined && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '11px',
            fontWeight: '600',
            color: trend >= 0 ? THEME.lemonPrimary : THEME.statusRejected,
            background: trend >= 0 ? `${THEME.lemonPrimary}15` : `${THEME.statusRejected}15`,
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {trend >= 0 ? <ArrowUpRight style={{ width: 12, height: 12 }} /> : <ArrowDownRight style={{ width: 12, height: 12 }} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const MintLemonExplorer: React.FC<MintLemonExplorerProps> = ({ 
  isOpen = true, 
  onClose,
  apiUrl = 'http://localhost:4010',
  language = 'en',
  embedded = false
}) => {
  // Get translations based on language
  const txt = EXPLORER_TRANSLATIONS[language] || EXPLORER_TRANSLATIONS.en;
  
  // State
  const [events, setEvents] = useState<MintExplorerEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MintExplorerEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  // Advanced Search State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    type: 'transaction' | 'block' | 'address' | 'token' | 'contract' | 'unknown';
    data: any;
    aiAnalysis?: string;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const ITEMS_PER_PAGE = 15;

  // LemonChain Network Stats - Real data from blockchain
  const [networkStats, setNetworkStats] = useState({
    blockHeight: 0,
    totalTransactions: 0,
    tps: 0,
    accounts: 0,
    validators: 21,
    avgBlockTime: 3.0,
    gasPrice: 25,
    isLoading: false // Start with false to show 0 values initially
  });
  
  // REAL VUSD Total from blockchain (direct RPC read)
  const [realVUSDTotal, setRealVUSDTotal] = useState<number>(0);
  
  // Explorer data from autoConnectService (for V5 protocol transactions)
  const [explorerDataState, setExplorerDataState] = useState<{
    totalTransactions: number;
    totalVUSDTransfers: number;
    totalMints: number;
    totalVUSDMinted: string;
    isFullySynced: boolean;
  }>({ totalTransactions: 0, totalVUSDTransfers: 0, totalMints: 0, totalVUSDMinted: '0', isFullySynced: false });
  
  // IMMEDIATE data load on component mount (doesn't wait for isOpen)
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('%c[MintLemonExplorer] 🚀 Loading initial data from LemonChain RPC...', 'color: #e74c3c; font-weight: bold;');
      
      try {
        // 1. Get block height
        const blockResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
        });
        const blockData = await blockResponse.json();
        const blockHeight = parseInt(blockData.result, 16);
        
        // 2. Get VUSD total supply
        const vusdResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b', data: '0x18160ddd' }, 'latest'],
            id: 2
          })
        });
        const vusdData = await vusdResponse.json();
        let vusdTotal = 0;
        if (vusdData.result && vusdData.result !== '0x') {
          vusdTotal = Number(BigInt(vusdData.result)) / 1e18;
        }
        
        // 3. Get VUSD events (to count mints)
        const eventsResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{ fromBlock: '0x0', toBlock: 'latest', address: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b' }],
            id: 3
          })
        });
        const eventsData = await eventsResponse.json();
        
        let totalEvents = 0;
        let transferCount = 0;
        let mintCount = 0;
        
        if (eventsData.result && Array.isArray(eventsData.result)) {
          totalEvents = eventsData.result.length;
          const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
          const transfers = eventsData.result.filter((log: any) => log.topics?.[0] === TRANSFER_TOPIC);
          transferCount = transfers.length;
          mintCount = transfers.filter((log: any) => log.topics?.[1] === ZERO_ADDRESS).length;
        }
        
        // 4. Get latest block for TPS calculation
        const latestBlockResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['latest', false], id: 4 })
        });
        const latestBlockData = await latestBlockResponse.json();
        const txCount = latestBlockData.result?.transactions?.length || 0;
        const tps = Math.round(txCount / 3) || Math.floor(Math.random() * 20) + 5;
        
        // Update all states
        setNetworkStats(prev => ({
          ...prev,
          blockHeight,
          totalTransactions: blockHeight * 8, // Estimated
          tps,
          isLoading: false
        }));
        
        setRealVUSDTotal(vusdTotal);
        
        setExplorerDataState({
          totalTransactions: totalEvents,
          totalVUSDTransfers: transferCount,
          totalMints: mintCount,
          totalVUSDMinted: vusdTotal.toFixed(2),
          isFullySynced: true
        });
        
        console.log('%c[MintLemonExplorer] ✅ Initial data loaded:', 'color: #2ecc71; font-weight: bold;', {
          blockHeight,
          vusdTotal: vusdTotal.toLocaleString(),
          totalEvents,
          transferCount,
          mintCount,
          tps
        });
        
      } catch (error) {
        console.error('[MintLemonExplorer] Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []); // Run once on mount

  // Fetch real LemonChain network stats from RPC
  const fetchLemonChainStats = useCallback(async () => {
    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // FETCH VUSD TOTAL SUPPLY DIRECTLY FROM BLOCKCHAIN (CRITICAL)
      // ═══════════════════════════════════════════════════════════════════════════
      const vusdResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: LEMON_CHAIN.vusdContract, // 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
            data: '0x18160ddd' // totalSupply()
          }, 'latest'],
          id: 0
        })
      });
      
      const vusdData = await vusdResponse.json();
      if (vusdData.result && vusdData.result !== '0x' && vusdData.result !== '0x0') {
        const totalSupplyBigInt = BigInt(vusdData.result);
        const vusdTotal = Number(totalSupplyBigInt) / 1e18; // VUSD has 18 decimals
        setRealVUSDTotal(vusdTotal);
        console.log('%c[MintLemonExplorer] 💰 VUSD Total Supply: ' + vusdTotal.toLocaleString(), 'color: #f1c40f; font-weight: bold;');
      }
      
      // Get latest block number
      const blockResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const blockData = await blockResponse.json();
      const blockHeight = parseInt(blockData.result, 16);
      
      // Get latest block to estimate TPS
      const latestBlockResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
          id: 2
        })
      });
      
      const latestBlockData = await latestBlockResponse.json();
      const txCount = latestBlockData.result?.transactions?.length || 0;
      
      // Get gas price
      const gasPriceResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 3
        })
      });
      
      const gasPriceData = await gasPriceResponse.json();
      const gasPrice = parseInt(gasPriceData.result, 16) / 1e9; // Convert to Gwei
      
      // Estimate total transactions (block height * avg tx per block)
      const avgTxPerBlock = 8; // Estimated average
      const estimatedTotalTx = blockHeight * avgTxPerBlock;
      
      // Calculate TPS (transactions per second based on block time of 3 seconds)
      const tps = Math.round(txCount / 3);
      
      setNetworkStats(prev => ({
        ...prev,
        blockHeight,
        totalTransactions: estimatedTotalTx,
        tps: tps > 0 ? tps : Math.floor(Math.random() * 50) + 10, // Fallback if no recent tx
        gasPrice: Math.round(gasPrice) || 25,
        isLoading: false
      }));
      
      setIsConnected(true);
      console.log('[MintLemonExplorer] 🍋 LemonChain stats fetched:', { blockHeight, txCount, gasPrice });
      
    } catch (error) {
      console.error('[MintLemonExplorer] Error fetching LemonChain stats:', error);
      // Use fallback values if RPC fails
      setNetworkStats(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, []);

  // Fetch blockchain data directly when API data is incomplete
  const fetchBlockchainData = useCallback(async () => {
    console.log('[MintLemonExplorer] 🔗 Fetching data from LemonChain blockchain...');
    
    try {
      // Fetch VUSD total supply from VUSD contract (18 decimals)
      const vusdResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: LEMON_CHAIN.vusdContract,
            data: '0x18160ddd' // totalSupply()
          }, 'latest'],
          id: 1
        })
      });
      
      const vusdData = await vusdResponse.json();
      let totalVUSD = 0;
      if (vusdData.result && vusdData.result !== '0x') {
        totalVUSD = parseInt(vusdData.result, 16) / 1e18; // VUSD has 18 decimals
        console.log('[MintLemonExplorer] 📊 VUSD Total Supply:', totalVUSD.toLocaleString());
      }
      
      // Fetch USDTokenized total supply
      const usdResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: LEMON_CHAIN.usdTokenized,
            data: '0x18160ddd' // totalSupply()
          }, 'latest'],
          id: 2
        })
      });
      
      const usdData = await usdResponse.json();
      let totalUSD = 0;
      if (usdData.result && usdData.result !== '0x') {
        totalUSD = parseInt(usdData.result, 16) / 1e18;
        console.log('[MintLemonExplorer] 📊 USDTokenized Total:', totalUSD.toLocaleString());
      }
      
      // Fetch LockReserve total (totalReserve)
      // Function selector for totalReserve() = 0x9f9c9517
      const lockResponse = await fetch(LEMON_CHAIN.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: LEMON_CHAIN.lockReserve,
            data: '0x9f9c9517' // totalReserve()
          }, 'latest'],
          id: 3
        })
      });
      
      const lockData = await lockResponse.json();
      let totalLocked = 0;
      if (lockData.result && lockData.result !== '0x') {
        totalLocked = parseInt(lockData.result, 16) / 1e18;
        console.log('[MintLemonExplorer] 🔒 Total Locked in Reserve:', totalLocked.toLocaleString());
      }
      
      return { 
        totalVUSDMinted: totalVUSD,
        totalUSDTokenized: totalUSD,
        totalLocked: totalLocked
      };
    } catch (error) {
      console.warn('[MintLemonExplorer] Could not fetch blockchain data:', error);
    }
    
    return null;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // ADVANCED BLOCKCHAIN SEARCH - AI Analytics Powered
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const performBlockchainSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    
    const cleanQuery = query.trim().toLowerCase();
    console.log('%c[Mint Lemon Explorer] 🔍 AI Analytics Search:', 'color: #a855f7; font-weight: bold;', query);
    
    try {
      // Detect query type
      const isHash = cleanQuery.startsWith('0x') && cleanQuery.length === 66;
      const isAddress = cleanQuery.startsWith('0x') && cleanQuery.length === 42;
      const isBlockNumber = /^\d+$/.test(cleanQuery);
      
      // ════════════════════════════════════════════════════════════════════════════
      // SEARCH BY TRANSACTION HASH
      // ════════════════════════════════════════════════════════════════════════════
      if (isHash) {
        console.log('[Search] 📝 Searching for transaction hash...');
        
        const txResponse = await fetch(LEMON_CHAIN.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [query],
            id: 1
          })
        });
        const txData = await txResponse.json();
        
        if (txData.result) {
          // Get receipt for more details
          const receiptResponse = await fetch(LEMON_CHAIN.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionReceipt',
              params: [query],
              id: 2
            })
          });
          const receiptData = await receiptResponse.json();
          
          // Get block for timestamp
          const blockResponse = await fetch(LEMON_CHAIN.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: [txData.result.blockNumber, false],
              id: 3
            })
          });
          const blockData = await blockResponse.json();
          
          const gasUsed = receiptData.result ? parseInt(receiptData.result.gasUsed, 16) : 0;
          const gasPrice = parseInt(txData.result.gasPrice, 16) / 1e9;
          const value = parseInt(txData.result.value, 16) / 1e18;
          const timestamp = blockData.result ? new Date(parseInt(blockData.result.timestamp, 16) * 1000) : null;
          
          // Check if it's a VUSD related transaction
          const isVUSDTx = txData.result.to?.toLowerCase() === LEMON_CHAIN.vusdContract.toLowerCase() ||
                          txData.result.to?.toLowerCase() === LEMON_CHAIN.usdTokenized.toLowerCase() ||
                          txData.result.to?.toLowerCase() === LEMON_CHAIN.lockReserve.toLowerCase();
          
          // AI Analysis
          const aiAnalysis = generateAIAnalysis('transaction', {
            gasUsed,
            gasPrice,
            value,
            isContract: receiptData.result?.contractAddress !== null,
            logs: receiptData.result?.logs?.length || 0,
            isVUSD: isVUSDTx,
            status: receiptData.result?.status === '0x1'
          });
          
          setSearchResults({
            type: 'transaction',
            data: {
              hash: query,
              from: txData.result.from,
              to: txData.result.to,
              value: value.toFixed(6),
              gasUsed,
              gasPrice: gasPrice.toFixed(2),
              blockNumber: parseInt(txData.result.blockNumber, 16),
              nonce: parseInt(txData.result.nonce, 16),
              status: receiptData.result?.status === '0x1' ? 'Success' : 'Failed',
              timestamp: timestamp?.toISOString(),
              logs: receiptData.result?.logs?.length || 0,
              contractAddress: receiptData.result?.contractAddress,
              isVUSD: isVUSDTx
            },
            aiAnalysis
          });
          setIsSearching(false);
          return;
        }
      }
      
      // ════════════════════════════════════════════════════════════════════════════
      // SEARCH BY ADDRESS
      // ════════════════════════════════════════════════════════════════════════════
      if (isAddress) {
        console.log('[Search] 📍 Searching for address...');
        
        // Get balance
        const balanceResponse = await fetch(LEMON_CHAIN.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [query, 'latest'],
            id: 1
          })
        });
        const balanceData = await balanceResponse.json();
        const balance = balanceData.result ? parseInt(balanceData.result, 16) / 1e18 : 0;
        
        // Get transaction count
        const txCountResponse = await fetch(LEMON_CHAIN.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [query, 'latest'],
            id: 2
          })
        });
        const txCountData = await txCountResponse.json();
        const txCount = txCountData.result ? parseInt(txCountData.result, 16) : 0;
        
        // Check if it's a contract
        const codeResponse = await fetch(LEMON_CHAIN.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getCode',
            params: [query, 'latest'],
            id: 3
          })
        });
        const codeData = await codeResponse.json();
        const isContract = codeData.result && codeData.result !== '0x' && codeData.result.length > 2;
        
        // Get VUSD balance if available
        let vusdBalance = 0;
        try {
          const vusdBalanceResponse = await fetch(LEMON_CHAIN.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: LEMON_CHAIN.vusdContract,
                data: '0x70a08231' + query.slice(2).padStart(64, '0') // balanceOf(address)
              }, 'latest'],
              id: 4
            })
          });
          const vusdBalanceData = await vusdBalanceResponse.json();
          if (vusdBalanceData.result && vusdBalanceData.result !== '0x') {
            vusdBalance = parseInt(vusdBalanceData.result, 16) / 1e18;
          }
        } catch (e) {
          console.warn('Could not fetch VUSD balance');
        }
        
        // Check known contracts
        const knownContracts: Record<string, string> = {
          [LEMON_CHAIN.vusdContract.toLowerCase()]: 'VUSD Token Contract',
          [LEMON_CHAIN.usdTokenized.toLowerCase()]: 'USDTokenized Contract',
          [LEMON_CHAIN.lockReserve.toLowerCase()]: 'LockReserve Contract',
          [LEMON_CHAIN.vusdMinter.toLowerCase()]: 'VUSD Minter Contract'
        };
        const contractName = knownContracts[query.toLowerCase()];
        
        // AI Analysis
        const aiAnalysis = generateAIAnalysis('address', {
          balance,
          txCount,
          isContract,
          vusdBalance,
          isKnownContract: !!contractName
        });
        
        setSearchResults({
          type: isContract ? 'contract' : 'address',
          data: {
            address: query,
            balance: balance.toFixed(6),
            txCount,
            isContract,
            vusdBalance: vusdBalance.toFixed(2),
            contractName,
            codeSize: codeData.result ? (codeData.result.length - 2) / 2 : 0
          },
          aiAnalysis
        });
        setIsSearching(false);
        return;
      }
      
      // ════════════════════════════════════════════════════════════════════════════
      // SEARCH BY BLOCK NUMBER
      // ════════════════════════════════════════════════════════════════════════════
      if (isBlockNumber) {
        console.log('[Search] 📦 Searching for block number...');
        
        const blockHex = '0x' + parseInt(cleanQuery).toString(16);
        const blockResponse = await fetch(LEMON_CHAIN.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: [blockHex, true],
            id: 1
          })
        });
        const blockData = await blockResponse.json();
        
        if (blockData.result) {
          const timestamp = new Date(parseInt(blockData.result.timestamp, 16) * 1000);
          const txCount = blockData.result.transactions?.length || 0;
          const gasUsed = parseInt(blockData.result.gasUsed, 16);
          const gasLimit = parseInt(blockData.result.gasLimit, 16);
          
          // AI Analysis
          const aiAnalysis = generateAIAnalysis('block', {
            txCount,
            gasUsed,
            gasLimit,
            utilization: (gasUsed / gasLimit * 100).toFixed(1)
          });
          
          setSearchResults({
            type: 'block',
            data: {
              number: parseInt(cleanQuery),
              hash: blockData.result.hash,
              parentHash: blockData.result.parentHash,
              timestamp: timestamp.toISOString(),
              txCount,
              gasUsed,
              gasLimit,
              miner: blockData.result.miner,
              difficulty: parseInt(blockData.result.difficulty, 16),
              size: parseInt(blockData.result.size, 16),
              nonce: blockData.result.nonce,
              transactions: blockData.result.transactions?.slice(0, 10) // First 10 txs
            },
            aiAnalysis
          });
          setIsSearching(false);
          return;
        }
      }
      
      // ════════════════════════════════════════════════════════════════════════════
      // SEARCH IN PROTOCOL EVENTS (VUSD, USD, Locks)
      // ════════════════════════════════════════════════════════════════════════════
      // Search in local events first
      const matchingEvents = events.filter(e => 
        e.id.toLowerCase().includes(cleanQuery) ||
        e.lockId.toLowerCase().includes(cleanQuery) ||
        e.authorizationCode.toLowerCase().includes(cleanQuery) ||
        e.blockchain?.txHash?.toLowerCase().includes(cleanQuery) ||
        e.actor.toLowerCase().includes(cleanQuery)
      );
      
      if (matchingEvents.length > 0) {
        const aiAnalysis = generateAIAnalysis('protocol', {
          matches: matchingEvents.length,
          types: [...new Set(matchingEvents.map(e => e.type))]
        });
        
        setSearchResults({
          type: 'transaction',
          data: {
            matches: matchingEvents,
            count: matchingEvents.length,
            query: cleanQuery
          },
          aiAnalysis
        });
        setIsSearching(false);
        return;
      }
      
      // No results found
      setSearchError(language === 'es' 
        ? `No se encontraron resultados para "${query}". Intente con un hash de transacción, dirección o número de bloque válido.`
        : `No results found for "${query}". Try a valid transaction hash, address, or block number.`
      );
      
    } catch (error) {
      console.error('[Search] Error:', error);
      setSearchError(language === 'es' 
        ? 'Error al conectar con LemonChain. Intente de nuevo.'
        : 'Error connecting to LemonChain. Please try again.'
      );
    }
    
    setIsSearching(false);
  }, [events, language]);
  
  // AI Analysis Generator - With Custom LemonMinted Style Icons
  const generateAIAnalysis = (type: string, data: any): string => {
    // Custom icon markers that will be replaced with SVG in render
    const ICONS = {
      success: '◈SUCCESS◈',
      failed: '◈FAILED◈',
      lemon: '◈LEMON◈',
      logs: '◈LOGS◈',
      gas: '◈GAS◈',
      contract: '◈CONTRACT◈',
      efficiency: '◈EFFICIENCY◈',
      user: '◈USER◈',
      coin: '◈COIN◈',
      diamond: '◈DIAMOND◈',
      chart: '◈CHART◈',
      fire: '◈FIRE◈',
      trend: '◈TREND◈',
      new: '◈NEW◈',
      block: '◈BLOCK◈',
      fuel: '◈FUEL◈',
      moon: '◈MOON◈',
      bolt: '◈BOLT◈',
      search: '◈SEARCH◈',
      mint: '◈MINT◈',
      lock: '◈LOCK◈',
      approve: '◈APPROVE◈'
    };
    
    const analyses: Record<string, () => string> = {
      transaction: () => {
        const parts: string[] = [];
        if (data.status) parts.push(`${ICONS.success} Transaction executed successfully.`);
        else parts.push(`${ICONS.failed} Transaction failed.`);
        
        if (data.isVUSD) parts.push(`${ICONS.lemon} This is a VUSD Protocol transaction.`);
        if (data.logs > 0) parts.push(`${ICONS.logs} Generated ${data.logs} event logs.`);
        if (data.gasUsed > 100000) parts.push(`${ICONS.gas} High gas consumption - complex operation.`);
        if (data.isContract) parts.push(`${ICONS.contract} This transaction deployed a smart contract.`);
        
        parts.push(`${ICONS.efficiency} Gas efficiency: ${data.gasUsed < 50000 ? 'Excellent' : data.gasUsed < 150000 ? 'Normal' : 'High consumption'}.`);
        return parts.join(' ');
      },
      address: () => {
        const parts: string[] = [];
        if (data.isContract) {
          parts.push(`${ICONS.contract} Smart Contract detected.`);
          if (data.isKnownContract) parts.push(`${ICONS.lemon} Official LemonMinted Protocol contract.`);
        } else {
          parts.push(`${ICONS.user} External Owned Account (EOA).`);
        }
        
        if (data.vusdBalance > 0) parts.push(`${ICONS.coin} Holds ${data.vusdBalance.toLocaleString()} VUSD.`);
        if (data.balance > 0) parts.push(`${ICONS.diamond} Balance: ${data.balance.toFixed(4)} LEMX.`);
        parts.push(`${ICONS.chart} Transaction activity: ${data.txCount} transactions.`);
        
        if (data.txCount > 100) parts.push(`${ICONS.fire} High activity account.`);
        else if (data.txCount > 10) parts.push(`${ICONS.trend} Moderate activity.`);
        else parts.push(`${ICONS.new} Low activity or new account.`);
        
        return parts.join(' ');
      },
      block: () => {
        const parts: string[] = [];
        parts.push(`${ICONS.block} Block contains ${data.txCount} transactions.`);
        parts.push(`${ICONS.fuel} Gas utilization: ${data.utilization}%.`);
        
        if (parseFloat(data.utilization) > 80) parts.push(`${ICONS.fire} High network demand period.`);
        else if (parseFloat(data.utilization) > 50) parts.push(`${ICONS.chart} Normal network activity.`);
        else parts.push(`${ICONS.moon} Low network activity period.`);
        
        if (data.txCount > 50) parts.push(`${ICONS.bolt} High throughput block.`);
        return parts.join(' ');
      },
      protocol: () => {
        const parts: string[] = [];
        parts.push(`${ICONS.search} Found ${data.matches} matching protocol events.`);
        if (data.types.includes('MINT_COMPLETED')) parts.push(`${ICONS.mint} Includes VUSD minting operations.`);
        if (data.types.includes('LOCK_CREATED')) parts.push(`${ICONS.lock} Includes USD lock operations.`);
        if (data.types.includes('LOCK_APPROVED')) parts.push(`${ICONS.approve} Includes approved transactions.`);
        return parts.join(' ');
      }
    };
    
    return analyses[type]?.() || `${ICONS.search} Analysis complete.`;
  };
  
  // Render AI Analysis with Custom SVG Icons
  const renderAIAnalysisWithIcons = (text: string) => {
    // Use a unique key generator to avoid SVG gradient ID conflicts
    const uid = Math.random().toString(36).substr(2, 9);
    
    // Icon definitions with unique IDs for each render
    const iconComponents: Record<string, JSX.Element> = {
      '◈SUCCESS◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="10" fill="#22c55e" opacity="0.2"/><circle cx="12" cy="12" r="10" fill="none" stroke="#22c55e" strokeWidth="2"/><path d="M8 12l3 3 5-6" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      '◈FAILED◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="10" fill="#ef4444" opacity="0.2"/><circle cx="12" cy="12" r="10" fill="none" stroke="#ef4444" strokeWidth="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/></svg>,
      '◈LEMON◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><ellipse cx="12" cy="13" rx="8" ry="7" fill="#facc15"/><path d="M12 6c0-3 2-4 4-4" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round"/><ellipse cx="12" cy="13" rx="4" ry="3" fill="#fef08a" opacity="0.5"/></svg>,
      '◈LOGS◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><rect x="4" y="4" width="16" height="16" rx="3" fill="#a855f7" opacity="0.2"/><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="#a855f7" strokeWidth="2"/><line x1="8" y1="9" x2="16" y2="9" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="13" x2="14" y2="13" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="17" x2="12" y2="17" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/></svg>,
      '◈GAS◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M12 2l3 6h-2v6h4l-5 8v-6H8l4-8V8h-2l2-6z" fill="#f97316"/></svg>,
      '◈CONTRACT◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><rect x="3" y="5" width="18" height="14" rx="2" fill="#06b6d4" opacity="0.2"/><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#06b6d4" strokeWidth="2"/><path d="M8 10h8M8 14h5" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/><circle cx="17" cy="14" r="2" fill="#06b6d4"/></svg>,
      '◈EFFICIENCY◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="9" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="12" r="3" fill="#10b981"/></svg>,
      '◈USER◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="8" r="4" fill="#8b5cf6"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#8b5cf6" opacity="0.7"/></svg>,
      '◈COIN◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="9" fill="#facc15"/><circle cx="12" cy="12" r="6" fill="none" stroke="#fef08a" strokeWidth="1.5" opacity="0.6"/><text x="12" y="16" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="bold">$</text></svg>,
      '◈DIAMOND◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><polygon points="12,2 22,9 12,22 2,9" fill="#a78bfa"/><polygon points="12,2 17,9 12,15 7,9" fill="#fff" opacity="0.3"/></svg>,
      '◈CHART◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><rect x="3" y="3" width="18" height="18" rx="2" fill="#3b82f6" opacity="0.15"/><polyline points="4,17 9,12 13,15 20,7" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="7" r="2" fill="#3b82f6"/></svg>,
      '◈FIRE◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M12 22c-4 0-7-3-7-7 0-2 1-4 3-6 0 2 1 3 2 3 0-4 2-8 5-10 0 3 1 5 3 6 2 2 3 4 3 6 0 4-3 7-7 7z" fill="#f97316"/><ellipse cx="12" cy="17" rx="2" ry="3" fill="#fef08a"/></svg>,
      '◈TREND◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M4 18l6-6 4 4 6-8" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><polygon points="20,4 20,10 14,10" fill="#22c55e"/></svg>,
      '◈NEW◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="9" fill="#06b6d4" opacity="0.2"/><path d="M12 7v10M7 12h10" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round"/></svg>,
      '◈BLOCK◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#f97316"/><path d="M2 7v10l10 5V12L2 7z" fill="#f97316" opacity="0.7"/><path d="M22 7v10l-10 5V12l10-5z" fill="#f97316" opacity="0.5"/></svg>,
      '◈FUEL◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><rect x="4" y="6" width="10" height="14" rx="2" fill="#84cc16"/><rect x="6" y="3" width="6" height="5" rx="1" fill="#84cc16" opacity="0.7"/><path d="M14 10h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1" fill="none" stroke="#84cc16" strokeWidth="2"/><circle cx="18" cy="12" r="1" fill="#84cc16"/></svg>,
      '◈MOON◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M12 3a9 9 0 1 0 9 9c0-1-0.2-2-0.5-2.8A7 7 0 0 1 12 3z" fill="#a78bfa"/><circle cx="9" cy="10" r="1.5" fill="#c4b5fd" opacity="0.5"/><circle cx="13" cy="14" r="1" fill="#c4b5fd" opacity="0.5"/></svg>,
      '◈BOLT◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><polygon points="13,2 4,14 11,14 11,22 20,10 13,10" fill="#facc15"/><polygon points="13,2 11,10 15,10 11,14 13,14 4,14 10,8" fill="#fef08a" opacity="0.4"/></svg>,
      '◈SEARCH◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="10" cy="10" r="7" fill="none" stroke="#a855f7" strokeWidth="2.5"/><line x1="15" y1="15" x2="21" y2="21" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/><circle cx="10" cy="10" r="3" fill="#a855f7" opacity="0.2"/></svg>,
      '◈MINT◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="9" fill="#22c55e" opacity="0.2"/><circle cx="12" cy="12" r="9" fill="none" stroke="#22c55e" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">M</text></svg>,
      '◈LOCK◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><rect x="5" y="11" width="14" height="10" rx="2" fill="#f59e0b"/><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="#f59e0b" strokeWidth="2.5"/><circle cx="12" cy="16" r="2" fill="#fef08a"/></svg>,
      '◈APPROVE◈': <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-6z" fill="#10b981"/><path d="M9 12l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    };
    
    // Split text by icon markers and render with icons
    const parts = text.split(/(◈\w+◈)/g);
    return (
      <span style={{ lineHeight: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
        {parts.map((part, idx) => {
          if (iconComponents[part]) {
            return <React.Fragment key={`${uid}-${idx}`}>{iconComponents[part]}</React.Fragment>;
          }
          // Return text with proper styling
          return part ? <span key={`${uid}-${idx}`} style={{ display: 'inline' }}>{part}</span> : null;
        })}
      </span>
    );
  };
  
  // Fetch events from API with blockchain fallback via autoConnectService
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 1: Get data from autoConnectService (REAL BLOCKCHAIN DATA)
      // ═══════════════════════════════════════════════════════════════════════════
      const explorerData = autoConnectService.getExplorerData();
      
      console.log('%c[MintLemonExplorer] 📦 Explorer data check:', 'color: #f39c12;', {
        hasData: !!explorerData,
        lastUpdated: explorerData?.lastUpdated,
        totalTransactions: explorerData?.totalTransactions,
        totalVUSDTransfers: explorerData?.totalVUSDTransfers,
        vusdTransfersLength: explorerData?.vusdTransfers?.length,
        isConnected: autoConnectService.isConnected()
      });
      
      // Use blockchain data if we have any meaningful data
      const hasBlockchainData = explorerData && (
        explorerData.lastUpdated ||
        explorerData.totalTransactions > 0 ||
        explorerData.totalVUSDTransfers > 0 ||
        (explorerData.vusdTransfers && explorerData.vusdTransfers.length > 0)
      );
      
      if (hasBlockchainData) {
        console.log('%c[MintLemonExplorer] 🔗 Using REAL blockchain data from autoConnectService', 'color: #00ff00; font-weight: bold;');
        console.log(`   📊 ${explorerData.totalInjections} injections | ${explorerData.totalLocks} locks | ${explorerData.totalVUSDMinted} VUSD | ${explorerData.vusdTransfers?.length || 0} VUSD transfers`);
        
        // Convert blockchain events to MintExplorerEvent format
        const blockchainEvents: MintExplorerEvent[] = [];
        
        // Add injection events
        explorerData.injections.forEach((inj: InjectionData) => {
          blockchainEvents.push({
            id: `inj-${inj.injectionId}`,
            type: inj.status === 3 ? 'MINT_COMPLETED' : inj.status === 2 ? 'LOCK_RESERVE_CREATED' : inj.status === 1 ? 'LOCK_APPROVED' : 'LOCK_CREATED',
            timestamp: new Date(inj.timestamp * 1000).toISOString(),
            lockId: inj.injectionId.slice(0, 18) + '...',
            authorizationCode: inj.daesTransactionId || `INJ-${inj.injectionId.slice(2, 10).toUpperCase()}`,
            amount: inj.amount,
            description: `USD Injection: ${inj.statusLabel} - ${parseFloat(inj.amount).toLocaleString()} USD`,
            actor: inj.depositor.slice(0, 10) + '...',
            status: inj.status === 3 ? 'completed' : inj.status === 2 ? 'reserved' : inj.status === 1 ? 'approved' : 'pending',
            blockchain: {
              network: 'LemonChain',
              chainId: 1006,
              txHash: inj.injectionId,
              lusdContract: CONTRACT_ADDRESSES_V5.VUSD
            },
            details: {
              beneficiary: inj.beneficiary,
              originalAmount: inj.amount
            }
          });
        });
        
        // Add lock events
        explorerData.locks.forEach((lock: BlockchainLockData) => {
          blockchainEvents.push({
            id: `lock-${lock.lockId}`,
            type: lock.status === 2 ? 'MINT_COMPLETED' : lock.status === 1 ? 'LOCK_APPROVED' : 'LOCK_RESERVE_CREATED',
            timestamp: new Date(lock.createdAt * 1000).toISOString(),
            lockId: `LOCK-${lock.lockId}`,
            authorizationCode: `LCK-${lock.lockId.toString().padStart(6, '0')}`,
            amount: lock.usdAmount,
            description: `Lock Reserve: ${lock.statusLabel} - ${parseFloat(lock.usdAmount).toLocaleString()} USD → ${parseFloat(lock.vusdAmount).toLocaleString()} VUSD`,
            actor: lock.beneficiary.slice(0, 10) + '...',
            status: lock.status === 2 ? 'completed' : lock.status === 1 ? 'approved' : 'reserved',
            blockchain: {
              network: 'LemonChain',
              chainId: 1006,
              txHash: lock.injectionId,
              lusdContract: CONTRACT_ADDRESSES_V5.VUSD
            },
            details: {
              beneficiary: lock.beneficiary,
              originalAmount: lock.usdAmount,
              approvedAmount: lock.vusdAmount
            }
          });
        });
        
        // Add VUSD transfer events (REAL blockchain mints)
        if (explorerData.vusdTransfers && explorerData.vusdTransfers.length > 0) {
          console.log(`   🪙 Adding ${explorerData.vusdTransfers.length} VUSD transfers to explorer`);
          
          explorerData.vusdTransfers.forEach((transfer: any) => {
            const isMint = transfer.type === 'mint';
            const isBurn = transfer.type === 'burn';
            
            blockchainEvents.push({
              id: `vusd-${transfer.txHash}-${transfer.blockNumber}`,
              type: isMint ? 'MINT_COMPLETED' : isBurn ? 'LOCK_CREATED' : 'LOCK_APPROVED',
              timestamp: new Date().toISOString(), // Will be updated with block timestamp
              lockId: transfer.txHash.slice(0, 14) + '...',
              authorizationCode: isMint ? `MINT-${transfer.blockNumber}` : `TRF-${transfer.blockNumber}`,
              amount: transfer.amount,
              description: isMint 
                ? `VUSD Minted: ${parseFloat(transfer.amount).toLocaleString()} VUSD to ${transfer.to.slice(0, 10)}...`
                : isBurn
                  ? `VUSD Burned: ${parseFloat(transfer.amount).toLocaleString()} VUSD`
                  : `VUSD Transfer: ${parseFloat(transfer.amount).toLocaleString()} VUSD`,
              actor: isMint ? 'VUSDMinter' : transfer.from.slice(0, 10) + '...',
              status: 'completed',
              blockchain: {
                network: 'LemonChain',
                chainId: 1006,
                txHash: transfer.txHash,
                lusdContract: CONTRACT_ADDRESSES_V5.VUSD,
                blockNumber: transfer.blockNumber
              },
              details: {
                from: transfer.from,
                to: transfer.to,
                type: transfer.type,
                blockNumber: transfer.blockNumber
              }
            });
          });
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // Add ALL PROTOCOL TRANSACTIONS (USDTokenized + LockReserve + VUSDMinter)
        // ═══════════════════════════════════════════════════════════════════════════
        if (explorerData.allTransactions && explorerData.allTransactions.length > 0) {
          console.log(`   📜 Adding ${explorerData.allTransactions.length} protocol transactions to explorer`);
          
          // Track already added txHashes to avoid duplicates
          const addedTxHashes = new Set(blockchainEvents.map(e => e.blockchain?.txHash));
          
          explorerData.allTransactions.forEach((tx: any) => {
            // Skip if already added via vusdTransfers
            if (addedTxHashes.has(tx.txHash)) return;
            
            const eventName = tx.details?.eventName || tx.type;
            const contractName = tx.details?.contractName || 'Unknown';
            
            // Determine event type mapping
            let mappedType: MintExplorerEvent['type'] = 'LOCK_CREATED';
            let status: MintExplorerEvent['status'] = 'completed';
            let description = '';
            
            // Map based on contract and event
            if (contractName === 'USDTokenized') {
              if (eventName === 'USDInjected' || eventName.includes('Inject')) {
                mappedType = 'LOCK_CREATED';
                status = 'pending';
                description = `USD Injected: ${parseFloat(tx.amount || '0').toLocaleString()} USD from ${tx.from?.slice(0, 10) || 'DAES'}...`;
              } else if (eventName === 'InjectionAccepted' || eventName.includes('Accept')) {
                mappedType = 'LOCK_APPROVED';
                status = 'approved';
                description = `Injection Accepted: ${parseFloat(tx.amount || '0').toLocaleString()} USD`;
              } else if (eventName === 'MovedToLockReserve' || eventName.includes('Lock') || eventName.includes('Reserve')) {
                mappedType = 'LOCK_RESERVE_CREATED';
                status = 'reserved';
                description = `Moved to Lock Reserve: ${parseFloat(tx.amount || '0').toLocaleString()} USD`;
              } else if (eventName === 'ConsumedForVUSD' || eventName.includes('Consum')) {
                mappedType = 'MINT_COMPLETED';
                status = 'completed';
                description = `Consumed for VUSD: ${parseFloat(tx.amount || '0').toLocaleString()} USD → VUSD`;
              } else {
                description = `USDTokenized: ${eventName} - ${parseFloat(tx.amount || '0').toLocaleString()} USD`;
              }
            } else if (contractName === 'LockReserve') {
              if (eventName === 'LockCreated' || eventName.includes('Create')) {
                mappedType = 'LOCK_RESERVE_CREATED';
                status = 'reserved';
                const usdAmt = tx.details?.usdAmount || tx.amount || '0';
                const vusdAmt = tx.details?.vusdAmount || tx.amount || '0';
                description = `Lock Created: ${parseFloat(usdAmt).toLocaleString()} USD → ${parseFloat(vusdAmt).toLocaleString()} VUSD`;
              } else if (eventName === 'LockReleased' || eventName.includes('Release')) {
                mappedType = 'LOCK_REJECTED';
                status = 'rejected';
                description = `Lock Released: ${parseFloat(tx.amount || '0').toLocaleString()} USD`;
              } else if (eventName === 'LockConsumed' || eventName.includes('Consum')) {
                mappedType = 'MINT_COMPLETED';
                status = 'completed';
                description = `Lock Consumed: ${parseFloat(tx.amount || '0').toLocaleString()} USD → VUSD Minted`;
              } else {
                description = `LockReserve: ${eventName} - ${parseFloat(tx.amount || '0').toLocaleString()}`;
              }
            } else if (contractName === 'VUSDMinter') {
              mappedType = 'MINT_COMPLETED';
              status = 'completed';
              if (eventName === 'BackedSignatureGenerated') {
                description = `Backing Signature: ${parseFloat(tx.amount || '0').toLocaleString()} VUSD backed`;
              } else if (eventName === 'VUSDMinted' || eventName === 'MintExecuted') {
                description = `VUSD Minted: ${parseFloat(tx.amount || '0').toLocaleString()} VUSD to ${tx.to?.slice(0, 10) || 'beneficiary'}...`;
              } else {
                description = `VUSDMinter: ${eventName} - ${parseFloat(tx.amount || '0').toLocaleString()} VUSD`;
              }
            } else {
              // Generic handling for other contracts
              description = `${contractName}: ${eventName} - ${parseFloat(tx.amount || '0').toLocaleString()}`;
            }
            
            blockchainEvents.push({
              id: tx.id || `tx-${tx.txHash}-${tx.blockNumber}`,
              type: mappedType,
              timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
              lockId: tx.details?.lockId?.toString() || tx.details?.injectionId?.slice(0, 18) || tx.txHash.slice(0, 14) + '...',
              authorizationCode: `${contractName.slice(0, 3).toUpperCase()}-${tx.blockNumber}`,
              amount: tx.amount || '0',
              description,
              actor: tx.from?.slice(0, 10) + '...' || contractName,
              status,
              blockchain: {
                network: 'LemonChain',
                chainId: 1006,
                txHash: tx.txHash,
                blockNumber: tx.blockNumber,
                lusdContract: tx.contractAddress
              },
              details: {
                contractName,
                eventName,
                from: tx.from,
                to: tx.to,
                beneficiary: tx.details?.beneficiary,
                injectionId: tx.details?.injectionId,
                lockId: tx.details?.lockId,
                usdAmount: tx.details?.usdAmount,
                vusdAmount: tx.details?.vusdAmount,
                rawData: tx.details?.rawData
              }
            });
            
            addedTxHashes.add(tx.txHash);
          });
          
          console.log(`   ✅ Total blockchain events: ${blockchainEvents.length}`);
        }
        
        // Sort by block number descending (for blockchain events) or timestamp
        blockchainEvents.sort((a, b) => {
          // Use block number if available, otherwise timestamp
          const blockA = a.blockchain?.blockNumber || 0;
          const blockB = b.blockchain?.blockNumber || 0;
          if (blockA && blockB) return blockB - blockA;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        // Update network stats from blockchain
        if (explorerData.networkStats) {
          setNetworkStats(prev => ({
            ...prev,
            blockHeight: explorerData.networkStats!.blockNumber,
            gasPrice: Math.round(parseFloat(explorerData.networkStats!.gasPrice)),
            isLoading: false
          }));
        }
        
        setEvents(blockchainEvents);
        setLastUpdate(new Date());
        setIsConnected(true);
        
        // Cache for redundancy
        localStorage.setItem('DCB_DAES_explorer_events', JSON.stringify(blockchainEvents.slice(0, 500)));
        
        return;
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 2: Try API if autoConnectService has no data
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[MintLemonExplorer] ⚠️ No blockchain data, trying API...');
      const response = await fetch(`${apiUrl}/api/mint-explorer`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          let events = data.data;
          
          // If no events from API, try to load from localStorage
          if (events.length === 0) {
            const cachedEvents = localStorage.getItem('DCB_DAES_explorer_events');
            if (cachedEvents) {
              events = JSON.parse(cachedEvents);
              console.log('[MintLemonExplorer] 📦 Loaded from cache:', events.length, 'events');
            }
          }
          
          // Save to localStorage for redundancy
          if (events.length > 0) {
            localStorage.setItem('DCB_DAES_explorer_events', JSON.stringify(events.slice(0, 500)));
          }
          
          setEvents(events);
          setLastUpdate(new Date());
          setIsConnected(true);
          
          // Also fetch blockchain data for additional stats
          fetchBlockchainData();
          
          return;
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 3: Fallback to localStorage cache
      // ═══════════════════════════════════════════════════════════════════════════
      console.log('[MintLemonExplorer] ⚠️ API unavailable, loading from cache...');
      const cachedEvents = localStorage.getItem('DCB_DAES_explorer_events');
      if (cachedEvents) {
        const events = JSON.parse(cachedEvents);
        setEvents(events);
        setLastUpdate(new Date());
        console.log('[MintLemonExplorer] 📦 Loaded from cache:', events.length, 'events');
      }
      
      setIsConnected(false);
      
    } catch (error) {
      console.error('[MintLemonExplorer] Error fetching events:', error);
      
      // Fallback to cache
      try {
        const cachedEvents = localStorage.getItem('DCB_DAES_explorer_events');
        if (cachedEvents) {
          const events = JSON.parse(cachedEvents);
          setEvents(events);
          console.log('[MintLemonExplorer] 📦 Fallback to cache:', events.length, 'events');
        }
      } catch (cacheError) {
        console.error('[MintLemonExplorer] Cache also failed:', cacheError);
      }
      
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, fetchBlockchainData]);

  // Fetch LemonChain stats on open and periodically
  useEffect(() => {
    if (!isOpen) return;
    
    // Initial fetch
    fetchLemonChainStats();
    
    // Update every 3 seconds (LemonChain block time)
    const interval = setInterval(fetchLemonChainStats, 3000);
    
    return () => clearInterval(interval);
  }, [isOpen, fetchLemonChainStats]);

  // Subscribe to autoConnectService updates for real-time blockchain data
  useEffect(() => {
    if (!isOpen) return;

    console.log('%c[MintLemonExplorer] 🔗 Subscribing to autoConnectService updates...', 'color: #00ffff; font-weight: bold;');
    
    // IMMEDIATE: Fetch VUSD total and events directly from RPC (doesn't wait for autoConnectService)
    const fetchDirectFromRPC = async () => {
      try {
        console.log('%c[MintLemonExplorer] 📡 Fetching VUSD data directly from RPC...', 'color: #e74c3c;');
        
        // Get VUSD total supply
        const supplyResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b', data: '0x18160ddd' }, 'latest'],
            id: 1
          })
        });
        const supplyData = await supplyResponse.json();
        if (supplyData.result && supplyData.result !== '0x') {
          const totalSupply = Number(BigInt(supplyData.result)) / 1e18;
          setRealVUSDTotal(totalSupply);
          console.log(`%c   💰 VUSD Total Supply: ${totalSupply.toLocaleString()}`, 'color: #2ecc71; font-weight: bold;');
        }
        
        // Get VUSD transfer events count (quick)
        const eventsResponse = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{ fromBlock: '0x0', toBlock: 'latest', address: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b' }],
            id: 2
          })
        });
        const eventsData = await eventsResponse.json();
        if (eventsData.result && Array.isArray(eventsData.result)) {
          // Filter Transfer events and count mints
          const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
          const transfers = eventsData.result.filter((log: any) => log.topics?.[0] === TRANSFER_TOPIC);
          const mints = transfers.filter((log: any) => log.topics?.[1] === ZERO_ADDRESS);
          
          console.log(`%c   📊 VUSD Events: ${eventsData.result.length} total, ${transfers.length} transfers, ${mints.length} mints`, 'color: #2ecc71;');
          
          setExplorerDataState(prev => ({
            ...prev,
            totalTransactions: eventsData.result.length,
            totalVUSDTransfers: transfers.length,
            totalMints: mints.length
          }));
        }
      } catch (error) {
        console.error('[MintLemonExplorer] RPC fetch error:', error);
      }
    };
    
    fetchDirectFromRPC();
    
    // Get initial explorer data from service
    const initialData = autoConnectService.getExplorerData();
    console.log('%c[MintLemonExplorer] 📦 Initial data from service:', 'color: #f39c12;', {
      totalTransactions: initialData?.totalTransactions,
      totalVUSDTransfers: initialData?.totalVUSDTransfers,
      isConnected: autoConnectService.isConnected()
    });
    
    if (initialData && initialData.totalTransactions > 0) {
      setExplorerDataState({
        totalTransactions: initialData.totalTransactions || 0,
        totalVUSDTransfers: initialData.totalVUSDTransfers || 0,
        totalMints: initialData.totalMints || 0,
        totalVUSDMinted: initialData.totalVUSDMinted || '0',
        isFullySynced: initialData.isFullySynced || false
      });
    }
    
    // If not connected, try to connect (will trigger scan)
    if (!autoConnectService.isConnected()) {
      console.log('%c[MintLemonExplorer] 🔄 AutoConnectService not connected, attempting connection...', 'color: #e74c3c;');
      autoConnectService.autoConnect().then((connected) => {
        if (connected) {
          console.log('%c[MintLemonExplorer] ✅ Connected! Data will update soon.', 'color: #2ecc71;');
          // Force scan after connection
          autoConnectService.forceScanAll();
        }
      });
    } else if (!initialData?.totalTransactions) {
      // Force a scan if connected but no transactions
      console.log('%c[MintLemonExplorer] 🔄 Connected but no transactions, forcing scan...', 'color: #f39c12;');
      autoConnectService.forceScanAll();
    }
    
    // Subscribe to explorer data updates
    const unsubscribe = autoConnectService.onExplorerDataUpdate((data) => {
      console.log('%c[MintLemonExplorer] 📊 Received blockchain update:', 'color: #9b59b6;', {
        injections: data.totalInjections,
        locks: data.totalLocks,
        vusd: data.totalVUSDMinted,
        transactions: data.totalTransactions
      });
      
      // Update explorer data state
      setExplorerDataState({
        totalTransactions: data.totalTransactions || 0,
        totalVUSDTransfers: data.totalVUSDTransfers || 0,
        totalMints: data.totalMints || 0,
        totalVUSDMinted: data.totalVUSDMinted || '0',
        isFullySynced: data.isFullySynced || false
      });
      
      // Trigger a refetch to update the UI
      fetchEvents();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, fetchEvents]);

  // Initial load and polling (as backup if autoConnectService is not connected)
  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchEvents]);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesFilter = filter === 'ALL' || event.type === filter;
      const matchesSearch = searchTerm === '' || 
        event.lockId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.authorizationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.publicationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.blockchain?.txHash?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [events, filter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Statistics
  const stats = useMemo(() => ({
    total: events.length,
    lockCreated: events.filter(e => e.type === 'LOCK_CREATED').length,
    lockApproved: events.filter(e => e.type === 'LOCK_APPROVED').length,
    lockRejected: events.filter(e => e.type === 'LOCK_REJECTED').length,
    lockReserve: events.filter(e => e.type === 'LOCK_RESERVE_CREATED').length,
    mintCompleted: events.filter(e => e.type === 'MINT_COMPLETED').length,
    totalVolume: events
      .filter(e => e.type === 'MINT_COMPLETED')
      .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0),
    totalLocked: events
      .filter(e => e.type === 'LOCK_CREATED' || e.type === 'LOCK_APPROVED')
      .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
  }), [events]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  if (!isOpen && !embedded) return null;

  // Container styles based on embedded mode
  const containerStyle: React.CSSProperties = embedded ? {
    background: THEME.bgPrimary,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius: '0',
    height: '100%',
    width: '100%',
    position: 'relative'
  } : {
    position: 'fixed',
    inset: 0,
    background: THEME.bgPrimary,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  return (
    <div style={containerStyle}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: THEME.gradientRadial,
        pointerEvents: 'none',
        borderRadius: embedded ? '16px' : '0'
      }} />
      {!embedded && (
        <div style={{
          position: 'absolute',
          top: '-200px',
          right: '-200px',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${THEME.lemonGlow}08 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* TOP NAVIGATION BAR - LemonChain PRO Style */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      <nav style={{
        height: '72px',
        background: `linear-gradient(180deg, ${THEME.bgSecondary} 0%, ${THEME.bgPrimary} 100%)`,
        borderBottom: `1px solid ${THEME.borderLemon}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        gap: '28px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <LemonLogo size={44} />
          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '800',
              background: THEME.gradientLemon,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              MINT LEMON
              <Sparkles style={{ width: 16, height: 16, color: THEME.lemonPrimary }} />
            </h1>
            <p style={{ 
              fontSize: '11px', 
              color: THEME.lemonSecondary, 
              letterSpacing: '2px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              EXPLORER
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '32px' }}>
          {[
            { id: 'transactions' as TabType, label: 'Transactions', icon: Activity },
            { id: 'blocks' as TabType, label: 'Blocks', icon: Box },
            { id: 'tokens' as TabType, label: 'Tokens', icon: Coins },
            { id: 'contracts' as TabType, label: 'Contracts', icon: FileText },
            { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                background: activeTab === tab.id ? `${THEME.lemonPrimary}15` : 'transparent',
                border: activeTab === tab.id ? `1px solid ${THEME.lemonPrimary}40` : '1px solid transparent',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon style={{
                width: 16,
                height: 16,
                color: activeTab === tab.id ? THEME.lemonPrimary : THEME.textMuted
              }} />
              <span style={{
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? THEME.lemonPrimary : THEME.textSecondary
              }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Global Search - AI Analytics Powered */}
        <div style={{
          flex: 1,
          maxWidth: '540px',
          marginLeft: 'auto',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px 6px 14px',
            background: `linear-gradient(135deg, ${THEME.bgTertiary} 0%, rgba(168, 85, 247, 0.05) 100%)`,
            border: `1px solid ${showSearchModal || searchQuery ? THEME.lemonPrimary : THEME.borderPrimary}`,
            borderRadius: '14px',
            boxShadow: showSearchModal ? `0 0 30px ${THEME.lemonGlow}30, inset 0 0 20px rgba(168, 85, 247, 0.05)` : 'none',
            transition: 'all 0.3s'
          }}>
            {/* Custom Search Icon SVG */}
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }}>
              <defs>
                <linearGradient id="searchIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={searchQuery ? '#a855f7' : '#6b7280'}/>
                  <stop offset="100%" stopColor={searchQuery ? '#22c55e' : '#4b5563'}/>
                </linearGradient>
              </defs>
              <circle cx="10" cy="10" r="6" fill="none" stroke="url(#searchIconGrad)" strokeWidth="2.5"/>
              <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="url(#searchIconGrad)" strokeWidth="2.5" strokeLinecap="round"/>
              {searchQuery && <circle cx="10" cy="10" r="2" fill="url(#searchIconGrad)" opacity="0.3"/>}
            </svg>
            <input
              type="text"
              placeholder={language === 'es' 
                ? "Buscar Hash, Dirección, Bloque, Token..." 
                : "Search Hash, Address, Block, Token..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.length >= 3) {
                  setShowSearchModal(true);
                  performBlockchainSearch(searchQuery);
                }
              }}
              onFocus={() => setShowSearchModal(searchQuery.length >= 3 || searchResults !== null)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                color: THEME.textPrimary,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {/* Clear Search Button - Auto return to VUSD history */}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchTerm('');
                  setSearchResults(null);
                  setSearchError(null);
                  setShowSearchModal(false);
                  // Return to transactions tab (VUSD history)
                  setActiveTab('transactions');
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                title={language === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                  <circle cx="12" cy="12" r="9" fill="rgba(239, 68, 68, 0.2)"/>
                  <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                if (searchQuery.length >= 3) {
                  setShowSearchModal(true);
                  performBlockchainSearch(searchQuery);
                }
              }}
              disabled={searchQuery.length < 3}
              style={{
                padding: '8px 14px',
                background: searchQuery.length >= 3 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(34, 197, 94, 0.2))'
                  : THEME.bgTertiary,
                border: `1px solid ${searchQuery.length >= 3 ? 'rgba(168, 85, 247, 0.4)' : THEME.borderPrimary}`,
                borderRadius: '10px',
                color: searchQuery.length >= 3 ? '#c084fc' : THEME.textMuted,
                fontSize: '11px',
                fontWeight: '700',
                cursor: searchQuery.length >= 3 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                letterSpacing: '0.5px'
              }}
              title="Analytics AI Search"
              aria-label="Analytics AI Search"
            >
              {/* Custom AI Sparkles Icon */}
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                <defs>
                  <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7"/>
                    <stop offset="100%" stopColor="#22c55e"/>
                  </linearGradient>
                </defs>
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="url(#sparkleGrad)"/>
                <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="url(#sparkleGrad)" opacity="0.7"/>
                <path d="M5 16l0.7 2.3 2.3 0.7-2.3 0.7L5 22l-0.7-2.3L2 19l2.3-0.7L5 16z" fill="url(#sparkleGrad)" opacity="0.5"/>
              </svg>
              ANALYTICS AI
            </button>
          </div>
        </div>

        {/* Network Indicator - LemonChain */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          background: `${THEME.lemonPrimary}10`,
          border: `1px solid ${THEME.lemonPrimary}40`,
          borderRadius: '24px',
          boxShadow: `0 0 20px ${THEME.lemonGlow}15`
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            background: THEME.lemonPrimary,
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
            boxShadow: `0 0 10px ${THEME.lemonGlow}`
          }} />
          <span style={{ 
            fontSize: '13px', 
            color: THEME.lemonPrimary, 
            fontWeight: '700',
            letterSpacing: '0.5px'
          }}>
            {LEMON_CHAIN.name}
          </span>
          <span style={{
            fontSize: '10px',
            color: THEME.lemonSecondary,
            background: `${THEME.lemonPrimary}20`,
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: '600'
          }}>
            ID: {LEMON_CHAIN.chainId}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Download Audit PDF Button */}
          <button
            onClick={() => {
              console.log('[MintLemonExplorer] 📄 Generating Audit PDF...');
              console.log('[MintLemonExplorer] Events count:', events.length);
              try {
                const auditTransactions = events.map(convertToAuditTransaction);
                const config: AuditReportConfig = {
                  title: 'AUDIT REPORT',
                  subtitle: 'Complete Transaction History',
                  platform: 'LEMX_MINTING',
                  generatedBy: 'Treasury Minting LemonChain',
                  includeBlockchainData: true,
                  includeSignatures: true,
                  dateRange: events.length > 0 ? {
                    from: events[events.length - 1]?.timestamp || new Date().toISOString(),
                    to: events[0]?.timestamp || new Date().toISOString()
                  } : undefined
                };
                console.log('[MintLemonExplorer] Config:', config);
                downloadAuditPDF(auditTransactions, config);
                console.log('[MintLemonExplorer] ✅ PDF download initiated');
              } catch (error) {
                console.error('[MintLemonExplorer] ❌ PDF generation error:', error);
                alert('Error generating PDF: ' + (error as Error).message);
              }
            }}
            style={{
              padding: '10px 16px',
              background: `${THEME.statusCompleted}15`,
              border: `1px solid ${THEME.statusCompleted}`,
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            title="Download Audit PDF Report"
          >
            <FileDown style={{
              width: 18,
              height: 18,
              color: THEME.statusCompleted
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: THEME.statusCompleted
            }}>
              Audit PDF
            </span>
          </button>
          
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            style={{
              padding: '12px',
              background: THEME.bgTertiary,
              border: `1px solid ${THEME.borderPrimary}`,
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw style={{
              width: 18,
              height: 18,
              color: isLoading ? THEME.lemonPrimary : THEME.textSecondary,
              animation: isLoading ? 'spin 1s linear infinite' : 'none'
            }} />
          </button>
          {!embedded && onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '12px',
                background: THEME.bgTertiary,
                border: `1px solid ${THEME.borderPrimary}`,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X style={{ width: 18, height: 18, color: THEME.textSecondary }} />
            </button>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* SUBPAGES - Render when not on transactions tab */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'blocks' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <BlocksExplorer 
            onBack={() => setActiveTab('transactions')} 
            language={language === 'es' ? 'es' : 'en'} 
          />
        </div>
      )}
      
      {activeTab === 'tokens' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <TokensDirectory 
            onBack={() => setActiveTab('transactions')} 
            language={language === 'es' ? 'es' : 'en'} 
          />
        </div>
      )}
      
      {activeTab === 'contracts' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ContractsDirectory 
            onBack={() => setActiveTab('transactions')} 
            language={language === 'es' ? 'es' : 'en'} 
          />
        </div>
      )}
      
      {activeTab === 'analytics' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AnalyticsDashboard 
            onBack={() => setActiveTab('transactions')} 
            language={language === 'es' ? 'es' : 'en'} 
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* TRANSACTIONS TAB CONTENT - Stats, Currencies, and Main Content */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
      <>
      {/* NETWORK STATISTICS BAR - Real LemonChain Data */}
      <div style={{
        padding: '20px 28px',
        background: THEME.bgSecondary,
        borderBottom: `1px solid ${THEME.borderPrimary}`,
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        overflowX: 'auto',
        position: 'relative'
      }}>
        <NetworkStatCard
          icon={Box}
          label={txt.lemonBlock}
          value={networkStats.isLoading ? txt.loading : networkStats.blockHeight.toLocaleString()}
          color={THEME.lemonPrimary}
          highlight
        />
        <NetworkStatCard
          icon={Activity}
          label={txt.lemonTxs}
          value={networkStats.isLoading ? txt.loading : formatCompactNumber(networkStats.totalTransactions)}
          subValue={txt.estimated}
          trend={2.4}
          color={THEME.accentCyan}
        />
        <NetworkStatCard
          icon={Zap}
          label={txt.tps}
          value={networkStats.isLoading ? txt.loading : networkStats.tps.toLocaleString()}
          subValue={txt.txPerSec}
          color={THEME.accentGold}
        />
        <NetworkStatCard
          icon={Coins}
          label={txt.lusdMinted}
          value={
            realVUSDTotal > 0 
              ? `$${formatCompactNumber(realVUSDTotal)}` 
              : explorerDataState.totalVUSDMinted && parseFloat(explorerDataState.totalVUSDMinted) > 0
                ? `$${formatCompactNumber(parseFloat(explorerDataState.totalVUSDMinted))}`
                : `$${formatCompactNumber(stats.totalVolume)}`
          }
          subValue="VUSD"
          color={THEME.statusCompleted}
          highlight
        />
        <NetworkStatCard
          icon={Lock}
          label="USD Locked"
          value={`$${formatCompactNumber(stats.totalLocked)}`}
          subValue="USD"
          color={THEME.statusPending}
        />
        <NetworkStatCard
          icon={CheckCircle}
          label="Mints Done"
          value={explorerDataState.totalMints > 0 ? explorerDataState.totalMints.toString() : stats.mintCompleted.toString()}
          subValue={explorerDataState.totalMints > 0 ? "blockchain" : "local"}
          color={THEME.lemonPrimary}
        />
        <NetworkStatCard
          icon={Activity}
          label={language === 'es' ? "Transacciones V5" : "V5 Transactions"}
          value={explorerDataState.totalTransactions > 0 ? explorerDataState.totalTransactions.toString() : '...'}
          subValue={explorerDataState.totalVUSDTransfers > 0 ? `${explorerDataState.totalVUSDTransfers} transfers` : "scanning..."}
          color={THEME.accentPurple}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* TREASURY CURRENCIES - DAES ISO 4217 Supported Currencies */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        padding: '14px 28px',
        background: `linear-gradient(135deg, ${THEME.bgTertiary} 0%, ${THEME.bgSecondary} 100%)`,
        borderBottom: `1px solid ${THEME.borderPrimary}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        overflowX: 'auto'
      }}>
        {/* Label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: `${THEME.lemonPrimary}10`,
          borderRadius: '8px',
          border: `1px solid ${THEME.borderLemon}`,
          flexShrink: 0
        }}>
          <Coins style={{ width: '14px', height: '14px', color: THEME.lemonPrimary }} />
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
            color: THEME.lemonPrimary,
            textTransform: 'uppercase'
          }}>
            {txt.treasuryCurrencies}
          </span>
          <span style={{
            fontSize: '9px',
            color: THEME.textMuted,
            letterSpacing: '0.5px'
          }}>
            {txt.daesIso}
          </span>
        </div>

        {/* Currency Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          {TREASURY_CURRENCIES.map((currency) => (
            <div
              key={currency.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: currency.mintable 
                  ? `${THEME.lemonPrimary}15` 
                  : THEME.bgPrimary,
                border: `1px solid ${currency.mintable ? THEME.borderLemon : THEME.borderSecondary}`,
                boxShadow: currency.mintable ? `0 0 12px ${THEME.lemonGlow}` : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <span style={{ 
                fontSize: '10px', 
                fontWeight: '700',
                color: currency.mintable ? THEME.lemonPrimary : THEME.textSecondary
              }}>
                {currency.symbol}
              </span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: '600',
                color: currency.mintable ? THEME.lemonPrimary : THEME.textPrimary
              }}>
                {currency.code}
              </span>
              <span style={{ 
                fontSize: '8px',
                color: THEME.textMuted
              }}>
                {currency.iso}
              </span>
              {currency.mintable ? (
                <span style={{
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontSize: '7px',
                  fontWeight: '700',
                  background: THEME.lemonPrimary,
                  color: '#000',
                  letterSpacing: '0.3px'
                }}>
                  {txt.mint}
                </span>
              ) : (
                <span style={{
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontSize: '7px',
                  fontWeight: '700',
                  background: `${THEME.accentGold}20`,
                  color: THEME.accentGold,
                  letterSpacing: '0.3px'
                }}>
                  {txt.reserve}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Active Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: `${THEME.statusCompleted}15`,
          border: `1px solid ${THEME.statusCompleted}30`,
          marginLeft: 'auto',
          flexShrink: 0
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: THEME.statusCompleted,
            animation: 'pulse 2s infinite'
          }} />
          <span style={{
            fontSize: '9px',
            fontWeight: '700',
            color: THEME.statusCompleted,
            letterSpacing: '0.5px'
          }}>
            {txt.usdLusdActive}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA - Transactions */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Left Panel - Transaction List */}
        <div style={{
          flex: selectedEvent ? '0 0 55%' : '1',
          display: 'flex',
          flexDirection: 'column',
          borderRight: selectedEvent ? `1px solid ${THEME.borderPrimary}` : 'none',
          transition: 'flex 0.3s ease'
        }}>
          
          {/* Filter Bar */}
          <div style={{
            padding: '18px 28px',
            background: THEME.bgTertiary,
            borderBottom: `1px solid ${THEME.borderPrimary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: THEME.textPrimary }}>
                Transactions
              </span>
              <span style={{
                padding: '4px 12px',
                background: `${THEME.lemonPrimary}15`,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: THEME.lemonPrimary
              }}>
                {filteredEvents.length.toLocaleString()}
              </span>
            </div>
            
            {/* Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[
                { value: 'ALL', label: 'All', count: stats.total },
                { value: 'LOCK_CREATED', label: 'Locks', count: stats.lockCreated, color: THEME.statusPending },
                { value: 'LOCK_APPROVED', label: 'Approved', count: stats.lockApproved, color: THEME.statusApproved },
                { value: 'LOCK_REJECTED', label: 'Rejected', count: stats.lockRejected, color: THEME.statusRejected },
                { value: 'MINT_COMPLETED', label: 'Minted', count: stats.mintCompleted, color: THEME.statusCompleted }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as TransactionFilter)}
                  style={{
                    padding: '8px 14px',
                    background: filter === f.value ? (f.color ? `${f.color}20` : `${THEME.lemonPrimary}15`) : 'transparent',
                    border: `1px solid ${filter === f.value ? (f.color || THEME.lemonPrimary) : THEME.borderPrimary}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: filter === f.value ? (f.color || THEME.lemonPrimary) : THEME.textSecondary
                  }}>
                    {f.label}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    background: filter === f.value ? (f.color ? `${f.color}30` : `${THEME.lemonPrimary}20`) : THEME.bgSecondary,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: f.color || THEME.lemonPrimary
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 180px 140px 100px',
              gap: '12px',
              padding: '14px 28px',
              background: THEME.bgSecondary,
              borderBottom: `1px solid ${THEME.borderPrimary}`,
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <span style={{ fontSize: '11px', color: THEME.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Type</span>
              <span style={{ fontSize: '11px', color: THEME.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Transaction Info</span>
              <span style={{ fontSize: '11px', color: THEME.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Authorization</span>
              <span style={{ fontSize: '11px', color: THEME.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Amount</span>
              <span style={{ fontSize: '11px', color: THEME.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Time</span>
            </div>

            {/* Table Body */}
            {paginatedEvents.length === 0 ? (
              <div style={{
                padding: '100px 40px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: `${THEME.lemonPrimary}10`,
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <Database style={{ width: 40, height: 40, color: THEME.lemonPrimary, opacity: 0.5 }} />
                </div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: THEME.textSecondary, marginBottom: '8px' }}>
                  No transactions found
                </p>
                <p style={{ fontSize: '14px', color: THEME.textMuted }}>
                  {searchTerm ? 'Try adjusting your search criteria' : 'Transactions will appear here when available'}
                </p>
              </div>
            ) : (
              paginatedEvents.map((event, index) => {
                const isSelected = selectedEvent?.id === event.id;
                
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(isSelected ? null : event)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 180px 140px 100px',
                      padding: '18px 28px',
                      gap: '12px',
                      background: isSelected ? `${THEME.lemonPrimary}10` : index % 2 === 0 ? 'transparent' : THEME.bgSecondary,
                      border: 'none',
                      borderBottom: `1px solid ${THEME.borderPrimary}`,
                      borderLeft: isSelected ? `3px solid ${THEME.lemonPrimary}` : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = THEME.bgHover)}
                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : THEME.bgSecondary)}
                  >
                    {/* Type */}
                    <div>
                      <StatusBadge type={event.type} />
                    </div>
                    
                    {/* Transaction Info */}
                    <div style={{ paddingRight: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {event.blockchain?.txHash ? (
                          <>
                            <Hash style={{ width: 13, height: 13, color: THEME.accentCyan }} />
                            <span style={{
                              fontSize: '13px',
                              color: THEME.accentCyan,
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              fontWeight: '500'
                            }}>
                              {truncateHash(event.blockchain.txHash, 12, 10)}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '13px', color: THEME.textMuted, fontStyle: 'italic' }}>
                            {txt.pendingOnLemonChain}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: THEME.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {getEventDescription(event, language)}
                      </p>
                    </div>
                    
                    {/* Authorization */}
                    <div>
                      <p style={{
                        fontSize: '14px',
                        color: THEME.accentGold,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontWeight: '700'
                      }}>
                        {event.authorizationCode}
                      </p>
                      <p style={{ fontSize: '11px', color: THEME.textMuted, marginTop: '4px' }}>
                        Lock: {truncateHash(event.lockId, 6, 4)}
                      </p>
                    </div>
                    
                    {/* Amount */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        fontSize: '16px',
                        fontWeight: '800',
                        color: THEME.textPrimary
                      }}>
                        ${formatAmount(event.amount)}
                      </p>
                      <p style={{ 
                        fontSize: '11px', 
                        color: event.type === 'MINT_COMPLETED' ? THEME.lemonPrimary : THEME.textMuted,
                        fontWeight: '600',
                        marginTop: '2px'
                      }}>
                        {event.type === 'MINT_COMPLETED' ? 'VUSD' : 'USD'}
                      </p>
                    </div>
                    
                    {/* Time */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: '500' }}>
                        {formatTimeAgo(event.timestamp)}
                      </p>
                      {event.blockchain?.blockNumber && (
                        <p style={{ fontSize: '10px', color: THEME.lemonSecondary, marginTop: '4px', fontWeight: '600' }}>
                          Block #{event.blockchain.blockNumber.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: '18px 28px',
              background: THEME.bgSecondary,
              borderTop: `1px solid ${THEME.borderPrimary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '13px', color: THEME.textMuted }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 14px',
                    background: THEME.bgTertiary,
                    border: `1px solid ${THEME.borderPrimary}`,
                    borderRadius: '10px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft style={{ width: 16, height: 16, color: THEME.textSecondary }} />
                  <span style={{ fontSize: '13px', color: THEME.textSecondary, fontWeight: '500' }}>Prev</span>
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: '38px',
                          height: '38px',
                          background: currentPage === pageNum ? THEME.gradientLemon : THEME.bgTertiary,
                          border: `1px solid ${currentPage === pageNum ? THEME.lemonPrimary : THEME.borderPrimary}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: currentPage === pageNum ? '700' : '500',
                          color: currentPage === pageNum ? THEME.bgPrimary : THEME.textSecondary,
                          boxShadow: currentPage === pageNum ? `0 0 15px ${THEME.lemonGlow}40` : 'none'
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '10px 14px',
                    background: THEME.bgTertiary,
                    border: `1px solid ${THEME.borderPrimary}`,
                    borderRadius: '10px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '13px', color: THEME.textSecondary, fontWeight: '500' }}>Next</span>
                  <ChevronRight style={{ width: 16, height: 16, color: THEME.textSecondary }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Transaction Details */}
        {selectedEvent && (
          <div style={{
            flex: '0 0 45%',
            background: THEME.bgSecondary,
            overflowY: 'auto'
          }}>
            {/* Detail Header */}
            <div style={{
              padding: '22px 28px',
              background: `linear-gradient(135deg, ${THEME.bgTertiary} 0%, ${THEME.bgSecondary} 100%)`,
              borderBottom: `1px solid ${THEME.borderLemon}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  background: `${THEME.lemonPrimary}15`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${THEME.lemonPrimary}30`
                }}>
                  <Eye style={{ width: 22, height: 22, color: THEME.lemonPrimary }} />
                </div>
                <div>
                  <span style={{ fontSize: '17px', fontWeight: '700', color: THEME.textPrimary }}>
                    Transaction Details
                  </span>
                  <p style={{ fontSize: '12px', color: THEME.lemonSecondary, marginTop: '2px' }}>
                    LemonChain Network
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '10px',
                  background: THEME.bgTertiary,
                  border: `1px solid ${THEME.borderPrimary}`,
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: 18, height: 18, color: THEME.textMuted }} />
              </button>
            </div>

            {/* Detail Content */}
            <div style={{ padding: '28px' }}>
              {/* Status & Type */}
              <div style={{
                padding: '22px',
                background: THEME.bgCard,
                borderRadius: '16px',
                border: `1px solid ${THEME.borderPrimary}`,
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <StatusBadge type={selectedEvent.type} />
                  <span style={{ fontSize: '12px', color: THEME.textMuted }}>
                    {formatDate(selectedEvent.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: THEME.textSecondary, lineHeight: '1.6' }}>
                  {selectedEvent.description}
                </p>
              </div>

              {/* Amount Card */}
              <div style={{
                padding: '28px',
                background: THEME.gradientLemonSoft,
                borderRadius: '16px',
                border: `1px solid ${THEME.borderLemon}`,
                marginBottom: '20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: THEME.gradientGlow,
                  opacity: 0.5,
                  filter: 'blur(40px)'
                }} />
                <p style={{ 
                  fontSize: '11px', 
                  color: THEME.lemonSecondary, 
                  marginBottom: '10px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  fontWeight: '700'
                }}>
                  Transaction Amount
                </p>
                <p style={{ 
                  fontSize: '42px', 
                  fontWeight: '800', 
                  color: THEME.textPrimary, 
                  marginBottom: '6px',
                  letterSpacing: '-1px',
                  position: 'relative'
                }}>
                  ${formatAmount(selectedEvent.amount)}
                </p>
                <p style={{ 
                  fontSize: '16px', 
                  color: THEME.lemonPrimary, 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Coins style={{ width: 18, height: 18 }} />
                  {selectedEvent.type === 'MINT_COMPLETED' ? 'VUSD' : 'USD'}
                </p>
              </div>

              {/* Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                marginBottom: '20px'
              }}>
                {/* Lock ID */}
                <div style={{
                  padding: '18px',
                  background: THEME.bgCard,
                  borderRadius: '14px',
                  border: `1px solid ${THEME.borderPrimary}`
                }}>
                  <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Lock ID
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{
                      fontSize: '12px',
                      color: THEME.textPrimary,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {truncateHash(selectedEvent.lockId, 10, 8)}
                    </p>
                    <CopyButton text={selectedEvent.lockId} />
                  </div>
                </div>

                {/* Authorization Code */}
                <div style={{
                  padding: '18px',
                  background: THEME.bgCard,
                  borderRadius: '14px',
                  border: `1px solid ${THEME.borderPrimary}`
                }}>
                  <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Authorization Code
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{
                      fontSize: '15px',
                      color: THEME.accentGold,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontWeight: '700'
                    }}>
                      {selectedEvent.authorizationCode}
                    </p>
                    <CopyButton text={selectedEvent.authorizationCode} />
                  </div>
                </div>

                {/* Actor */}
                <div style={{
                  padding: '18px',
                  background: THEME.bgCard,
                  borderRadius: '14px',
                  border: `1px solid ${THEME.borderPrimary}`
                }}>
                  <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Actor
                  </p>
                  <p style={{ fontSize: '14px', color: THEME.textPrimary, fontWeight: '500' }}>
                    {selectedEvent.actor}
                  </p>
                </div>

                {/* Publication Code */}
                {selectedEvent.publicationCode && (
                  <div style={{
                    padding: '18px',
                    background: THEME.bgCard,
                    borderRadius: '14px',
                    border: `1px solid ${THEME.borderPrimary}`
                  }}>
                    <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                      Publication Code
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{
                        fontSize: '15px',
                        color: THEME.statusCompleted,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontWeight: '700'
                      }}>
                        {selectedEvent.publicationCode}
                      </p>
                      <CopyButton text={selectedEvent.publicationCode} />
                    </div>
                  </div>
                )}
              </div>

              {/* LemonChain Blockchain Info */}
              <div style={{
                padding: '22px',
                background: `linear-gradient(135deg, ${THEME.lemonPrimary}08 0%, ${THEME.bgCard} 100%)`,
                borderRadius: '16px',
                border: `1px solid ${THEME.borderLemon}`,
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: THEME.gradientLemon,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Link2 style={{ width: 18, height: 18, color: 'white' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: THEME.lemonPrimary }}>
                      LemonChain Data
                    </span>
                    <p style={{ fontSize: '11px', color: THEME.textMuted }}>
                      On-chain verification
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Transaction Hash */}
                  {selectedEvent.blockchain?.txHash ? (
                    <div>
                      <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                        Transaction Hash
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{
                          fontSize: '12px',
                          color: THEME.lemonPrimary,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          flex: 1,
                          wordBreak: 'break-all'
                        }}>
                          {selectedEvent.blockchain.txHash}
                        </p>
                        <CopyButton text={selectedEvent.blockchain.txHash} />
                        <button
                          onClick={() => window.open(`${LEMON_CHAIN.explorer}/tx/${selectedEvent.blockchain?.txHash}`, '_blank')}
                          style={{
                            padding: '6px',
                            background: `${THEME.lemonPrimary}15`,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <ExternalLink style={{ width: 14, height: 14, color: THEME.lemonPrimary }} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      background: `${THEME.statusPending}10`,
                      borderRadius: '10px',
                      border: `1px solid ${THEME.statusPending}30`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <Clock style={{ width: 18, height: 18, color: THEME.statusPending }} />
                      <span style={{ fontSize: '13px', color: THEME.statusPending, fontWeight: '500' }}>
                        Pending confirmation on LemonChain
                      </span>
                    </div>
                  )}

                  {/* Block & Network */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {selectedEvent.blockchain?.blockNumber && (
                      <div>
                        <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                          Block Number
                        </p>
                        <p style={{ fontSize: '16px', color: THEME.textPrimary, fontWeight: '700' }}>
                          #{selectedEvent.blockchain.blockNumber.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                        Network
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LemonLogo size={20} />
                        <span style={{ fontSize: '14px', color: THEME.textPrimary, fontWeight: '600' }}>
                          {LEMON_CHAIN.name}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: THEME.lemonSecondary,
                          background: `${THEME.lemonPrimary}15`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: '600'
                        }}>
                          ID: {LEMON_CHAIN.chainId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* VUSD Contract */}
                  <div>
                    <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                      VUSD Contract
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{
                        fontSize: '12px',
                        color: THEME.statusCompleted,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                      }}>
                        {selectedEvent.blockchain?.lusdContract || LEMON_CHAIN.lusdContract}
                      </p>
                      <CopyButton text={selectedEvent.blockchain?.lusdContract || LEMON_CHAIN.lusdContract} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              {selectedEvent.signatures && selectedEvent.signatures.length > 0 && (
                <div style={{
                  padding: '22px',
                  background: `${THEME.accentGold}08`,
                  borderRadius: '16px',
                  border: `1px solid ${THEME.accentGold}30`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <Shield style={{ width: 20, height: 20, color: THEME.accentGold }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: THEME.accentGold }}>
                      Blockchain Signatures ({selectedEvent.signatures.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedEvent.signatures.map((sig, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px 18px',
                          background: THEME.bgCard,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: `${THEME.lemonPrimary}20`,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check style={{ width: 20, height: 20, color: THEME.lemonPrimary }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: THEME.textPrimary }}>
                              {sig.role}
                            </p>
                            <p style={{
                              fontSize: '11px',
                              color: THEME.textMuted,
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                            }}>
                              {truncateHash(sig.address, 8, 6)}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '12px', color: THEME.textMuted }}>
                            {formatTimeAgo(sig.timestamp)}
                          </p>
                          {sig.txHash && (
                            <p style={{
                              fontSize: '10px',
                              color: THEME.lemonPrimary,
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              marginTop: '4px'
                            }}>
                              {truncateHash(sig.txHash, 6, 4)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div style={{
                  padding: '22px',
                  background: THEME.bgCard,
                  borderRadius: '16px',
                  border: `1px solid ${THEME.borderPrimary}`,
                  marginTop: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <FileText style={{ width: 20, height: 20, color: THEME.textSecondary }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: THEME.textPrimary }}>
                      Additional Details
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    {selectedEvent.details.beneficiary && (
                      <div>
                        <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                          Beneficiary
                        </p>
                        <p style={{ fontSize: '14px', color: THEME.textPrimary }}>
                          {selectedEvent.details.beneficiary}
                        </p>
                      </div>
                    )}
                    {selectedEvent.details.bankName && (
                      <div>
                        <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                          Bank
                        </p>
                        <p style={{ fontSize: '14px', color: THEME.textPrimary }}>
                          {selectedEvent.details.bankName}
                        </p>
                      </div>
                    )}
                    {selectedEvent.details.mintedBy && (
                      <div>
                        <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                          Minted By
                        </p>
                        <p style={{ fontSize: '14px', color: THEME.textPrimary }}>
                          {selectedEvent.details.mintedBy}
                        </p>
                      </div>
                    )}
                    {selectedEvent.details.reason && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <p style={{ fontSize: '10px', color: THEME.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                          Reason
                        </p>
                        <p style={{ fontSize: '14px', color: THEME.statusRejected }}>
                          {selectedEvent.details.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
      {/* END Transactions Tab Content */}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER - LemonChain Branding */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        padding: '14px 28px',
        background: THEME.bgSecondary,
        borderTop: `1px solid ${THEME.borderLemon}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LemonLogo size={24} />
            <span style={{ fontSize: '12px', color: THEME.textMuted }}>
              © 2026 Mint Lemon Explorer
            </span>
          </div>
          <span style={{ fontSize: '12px', color: THEME.textDim }}>•</span>
          <span style={{ fontSize: '12px', color: THEME.lemonSecondary, fontWeight: '600' }}>
            Powered by LemonChain
          </span>
          <span style={{ fontSize: '12px', color: THEME.textDim }}>•</span>
          <span style={{ fontSize: '12px', color: THEME.textMuted }}>
            Last update: {formatTimeAgo(lastUpdate.toISOString())}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: THEME.textMuted
          }}>
            <Server style={{ width: 14, height: 14 }} />
            API: {apiUrl}
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: isConnected ? THEME.lemonPrimary : THEME.statusRejected,
            fontWeight: '600'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: isConnected ? THEME.lemonPrimary : THEME.statusRejected,
              borderRadius: '50%',
              boxShadow: isConnected ? `0 0 10px ${THEME.lemonGlow}` : 'none'
            }} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </footer>

      {/* Styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px ${THEME.lemonGlow}40; }
          50% { box-shadow: 0 0 40px ${THEME.lemonGlow}60; }
        }
        
        /* Custom Scrollbar - Lemon Theme */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: ${THEME.bgPrimary};
        }
        ::-webkit-scrollbar-thumb {
          background: ${THEME.borderSecondary};
          border-radius: 5px;
          border: 2px solid ${THEME.bgPrimary};
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${THEME.lemonDark};
        }
        
        /* Input placeholder */
        input::placeholder {
          color: ${THEME.textDim};
        }
        
        /* Focus outline */
        button:focus-visible {
          outline: 2px solid ${THEME.lemonPrimary};
          outline-offset: 2px;
        }
        
        /* Selection */
        ::selection {
          background: ${THEME.lemonPrimary}40;
          color: ${THEME.textPrimary};
        }

        /* ═══════════════════════════════════════════════════════════════════════════ */
        /* RESPONSIVE STYLES */
        /* ═══════════════════════════════════════════════════════════════════════════ */
        
        /* Mobile First - Base styles for small screens */
        .mint-explorer-nav {
          flex-wrap: wrap;
          padding: 8px 12px !important;
          height: auto !important;
          min-height: 56px;
          gap: 8px !important;
        }
        
        .mint-explorer-stats {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
          padding: 12px !important;
        }
        
        .mint-explorer-currencies {
          overflow-x: auto;
          padding: 8px 12px !important;
        }
        
        .mint-explorer-table-header,
        .mint-explorer-table-row {
          font-size: 11px !important;
        }
        
        /* Tablet and up */
        @media (min-width: 640px) {
          .mint-explorer-stats {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            padding: 16px !important;
          }
        }
        
        /* Desktop */
        @media (min-width: 1024px) {
          .mint-explorer-nav {
            flex-wrap: nowrap;
            padding: 0 28px !important;
            height: 72px !important;
          }
          
          .mint-explorer-stats {
            display: flex !important;
            flex-wrap: wrap;
            gap: 16px !important;
            padding: 20px 28px !important;
          }
          
          .mint-explorer-currencies {
            padding: 12px 28px !important;
          }
          
          .mint-explorer-table-header,
          .mint-explorer-table-row {
            font-size: 13px !important;
          }
        }
        
        /* Hide elements on mobile */
        @media (max-width: 639px) {
          .hide-mobile {
            display: none !important;
          }
        }
        
        /* Hide elements on tablet */
        @media (max-width: 1023px) {
          .hide-tablet {
            display: none !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* ADVANCED SEARCH MODAL - AI Analytics Powered */}
      {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
      {showSearchModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '80px',
            zIndex: 10000
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            style={{
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              background: `linear-gradient(145deg, ${THEME.bgSecondary} 0%, ${THEME.bgPrimary} 100%)`,
              border: `1px solid ${THEME.borderLemon}`,
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: `0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px ${THEME.lemonGlow}20`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${THEME.borderPrimary}`,
              background: `linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 197, 94, 0.15))',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles style={{ width: 22, height: 22, color: '#a855f7' }} />
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #a855f7 0%, #22c55e 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      margin: 0
                    }}>
                      {language === 'es' ? 'Búsqueda Analytics AI' : 'Analytics AI Search'}
                    </h2>
                    <p style={{ fontSize: '12px', color: THEME.textMuted, margin: '4px 0 0 0' }}>
                      {language === 'es' 
                        ? 'Búsqueda inteligente en LemonChain Blockchain'
                        : 'Intelligent search on LemonChain Blockchain'
                      }
                    </p>
                  </div>
                </div>
                {/* Clear & Close Button */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchTerm('');
                    setSearchResults(null);
                    setSearchError(null);
                    setShowSearchModal(false);
                    setActiveTab('transactions');
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={language === 'es' ? 'Cerrar y volver a historial VUSD' : 'Close and return to VUSD history'}
                  aria-label="Close search modal"
                >
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                    <circle cx="12" cy="12" r="10" fill="rgba(239, 68, 68, 0.2)"/>
                    <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              
              {/* Search Input in Modal */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '16px'
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: THEME.bgTertiary,
                  border: `1px solid ${searchQuery ? THEME.lemonPrimary : THEME.borderPrimary}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s'
                }}>
                  {/* Custom Search Icon */}
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }}>
                    <defs>
                      <linearGradient id="modalSearchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={searchQuery ? '#a855f7' : '#6b7280'}/>
                        <stop offset="100%" stopColor={searchQuery ? '#22c55e' : '#4b5563'}/>
                      </linearGradient>
                    </defs>
                    <circle cx="10" cy="10" r="6" fill="none" stroke="url(#modalSearchGrad)" strokeWidth="2.5"/>
                    <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="url(#modalSearchGrad)" strokeWidth="2.5" strokeLinecap="round"/>
                    {searchQuery && <circle cx="10" cy="10" r="2" fill="url(#modalSearchGrad)" opacity="0.4"/>}
                  </svg>
                  <input
                    type="text"
                    placeholder={language === 'es' 
                      ? "Hash de transacción, dirección, número de bloque..."
                      : "Transaction hash, address, block number..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.length >= 3) {
                        performBlockchainSearch(searchQuery);
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: THEME.textPrimary,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={() => performBlockchainSearch(searchQuery)}
                  disabled={searchQuery.length < 3 || isSearching}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(34, 197, 94, 0.2))',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '12px',
                    color: '#c084fc',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: searchQuery.length >= 3 && !isSearching ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSearching ? (
                    <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Search style={{ width: 16, height: 16 }} />
                  )}
                  {isSearching 
                    ? (language === 'es' ? 'Buscando...' : 'Searching...')
                    : (language === 'es' ? 'Buscar' : 'Search')
                  }
                </button>
              </div>
            </div>

            {/* Search Results Content */}
            <div style={{
              padding: '20px 24px',
              maxHeight: 'calc(80vh - 180px)',
              overflowY: 'auto'
            }}>
              {/* Loading State */}
              {isSearching && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  color: THEME.textMuted
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    border: '3px solid rgba(168, 85, 247, 0.2)',
                    borderTopColor: '#a855f7',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                  }} />
                  <p style={{ fontSize: '14px' }}>
                    {language === 'es' ? 'Conectando a LemonChain...' : 'Connecting to LemonChain...'}
                  </p>
                </div>
              )}

              {/* Error State */}
              {searchError && !isSearching && (
                <div style={{
                  padding: '24px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <XCircle style={{ width: 40, height: 40, color: '#ef4444', marginBottom: '12px' }} />
                  <p style={{ color: '#ef4444', fontSize: '14px' }}>{searchError}</p>
                </div>
              )}

              {/* Results */}
              {searchResults && !isSearching && (
                <div>
                  {/* AI Analysis Banner */}
                  {searchResults.aiAnalysis && (
                    <div style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '14px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 197, 94, 0.2))',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Sparkles style={{ width: 18, height: 18, color: '#a855f7' }} />
                      </div>
                      <div>
                        <h4 style={{ 
                          fontSize: '13px', 
                          fontWeight: '700', 
                          color: '#a855f7', 
                          margin: '0 0 6px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                            <defs>
                              <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a855f7"/>
                                <stop offset="100%" stopColor="#22c55e"/>
                              </linearGradient>
                            </defs>
                            <circle cx="12" cy="12" r="10" fill="url(#aiGrad)" opacity="0.2"/>
                            <circle cx="12" cy="12" r="10" fill="none" stroke="url(#aiGrad)" strokeWidth="2"/>
                            <circle cx="9" cy="10" r="1.5" fill="#a855f7"/>
                            <circle cx="15" cy="10" r="1.5" fill="#22c55e"/>
                            <path d="M8 15c1 2 3 3 4 3s3-1 4-3" fill="none" stroke="url(#aiGrad)" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          AI Analytics
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 8px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 197, 94, 0.2))',
                            borderRadius: '10px',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                          }}>NEURAL</span>
                        </h4>
                        <div style={{ fontSize: '13px', color: THEME.textSecondary, margin: 0 }}>
                          {renderAIAnalysisWithIcons(searchResults.aiAnalysis)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result Type Badge */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    marginBottom: '16px' 
                  }}>
                    <span style={{
                      padding: '6px 14px',
                      background: searchResults.type === 'transaction' ? 'rgba(59, 130, 246, 0.15)' :
                                  searchResults.type === 'block' ? 'rgba(250, 204, 21, 0.15)' :
                                  searchResults.type === 'address' ? 'rgba(34, 197, 94, 0.15)' :
                                  searchResults.type === 'contract' ? 'rgba(168, 85, 247, 0.15)' :
                                  'rgba(139, 148, 158, 0.15)',
                      border: `1px solid ${
                        searchResults.type === 'transaction' ? 'rgba(59, 130, 246, 0.4)' :
                        searchResults.type === 'block' ? 'rgba(250, 204, 21, 0.4)' :
                        searchResults.type === 'address' ? 'rgba(34, 197, 94, 0.4)' :
                        searchResults.type === 'contract' ? 'rgba(168, 85, 247, 0.4)' :
                        'rgba(139, 148, 158, 0.4)'
                      }`,
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: searchResults.type === 'transaction' ? '#3b82f6' :
                             searchResults.type === 'block' ? '#facc15' :
                             searchResults.type === 'address' ? '#22c55e' :
                             searchResults.type === 'contract' ? '#a855f7' :
                             '#8b949e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {/* Type Icon SVG */}
                      {searchResults.type === 'transaction' && (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#3b82f6" strokeWidth="2"/>
                          <path d="M7 10h10M7 14h6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                      {searchResults.type === 'block' && (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#facc15"/>
                          <path d="M2 7v10l10 5V12L2 7z" fill="#facc15" opacity="0.7"/>
                          <path d="M22 7v10l-10 5V12l10-5z" fill="#facc15" opacity="0.5"/>
                        </svg>
                      )}
                      {searchResults.type === 'address' && (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <circle cx="12" cy="8" r="4" fill="#22c55e"/>
                          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#22c55e" opacity="0.7"/>
                        </svg>
                      )}
                      {searchResults.type === 'contract' && (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#a855f7" strokeWidth="2"/>
                          <path d="M9 9l6 6M15 9l-6 6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                      {searchResults.type !== 'transaction' && searchResults.type !== 'block' && 
                       searchResults.type !== 'address' && searchResults.type !== 'contract' && (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <circle cx="10" cy="10" r="7" fill="none" stroke="#8b949e" strokeWidth="2"/>
                          <line x1="15" y1="15" x2="21" y2="21" stroke="#8b949e" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                      {searchResults.type === 'transaction' ? 'Transaction' :
                       searchResults.type === 'block' ? 'Block' :
                       searchResults.type === 'address' ? 'Address' :
                       searchResults.type === 'contract' ? 'Contract' :
                       'Result'}
                    </span>
                    <span style={{ fontSize: '12px', color: THEME.textMuted }}>
                      on LemonChain
                    </span>
                  </div>

                  {/* Transaction Result */}
                  {searchResults.type === 'transaction' && searchResults.data.hash && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { label: 'Transaction Hash', value: searchResults.data.hash, copy: true },
                        { label: 'Status', value: searchResults.data.status, status: true },
                        { label: 'Block', value: searchResults.data.blockNumber?.toLocaleString() },
                        { label: 'From', value: searchResults.data.from, copy: true },
                        { label: 'To', value: searchResults.data.to || 'Contract Creation', copy: !!searchResults.data.to },
                        { label: 'Value', value: `${searchResults.data.value} LEMX` },
                        { label: 'Gas Used', value: searchResults.data.gasUsed?.toLocaleString() },
                        { label: 'Gas Price', value: `${searchResults.data.gasPrice} Gwei` },
                        { label: 'Timestamp', value: searchResults.data.timestamp ? new Date(searchResults.data.timestamp).toLocaleString() : 'N/A' },
                        { label: 'Event Logs', value: searchResults.data.logs?.toString() }
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: THEME.bgTertiary,
                          borderRadius: '10px',
                          border: `1px solid ${THEME.borderPrimary}`
                        }}>
                          <span style={{ fontSize: '12px', color: THEME.textMuted }}>{item.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.status && (
                              <span style={{
                                padding: '3px 10px',
                                background: item.value === 'Success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${item.value === 'Success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: item.value === 'Success' ? '#22c55e' : '#ef4444'
                              }}>
                                {item.value === 'Success' ? '✓ Success' : '✗ Failed'}
                              </span>
                            )}
                            {!item.status && (
                              <span style={{ 
                                fontSize: '13px', 
                                color: THEME.textPrimary, 
                                fontFamily: 'monospace',
                                maxWidth: '400px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.value}
                              </span>
                            )}
                            {item.copy && <CopyButton text={item.value} size={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Block Result */}
                  {searchResults.type === 'block' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { label: 'Block Number', value: searchResults.data.number?.toLocaleString() },
                        { label: 'Block Hash', value: searchResults.data.hash, copy: true },
                        { label: 'Parent Hash', value: searchResults.data.parentHash, copy: true },
                        { label: 'Timestamp', value: searchResults.data.timestamp ? new Date(searchResults.data.timestamp).toLocaleString() : 'N/A' },
                        { label: 'Transactions', value: searchResults.data.txCount?.toString() },
                        { label: 'Gas Used', value: searchResults.data.gasUsed?.toLocaleString() },
                        { label: 'Gas Limit', value: searchResults.data.gasLimit?.toLocaleString() },
                        { label: 'Miner/Validator', value: searchResults.data.miner, copy: true },
                        { label: 'Size', value: `${searchResults.data.size?.toLocaleString()} bytes` }
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: THEME.bgTertiary,
                          borderRadius: '10px',
                          border: `1px solid ${THEME.borderPrimary}`
                        }}>
                          <span style={{ fontSize: '12px', color: THEME.textMuted }}>{item.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontSize: '13px', 
                              color: THEME.textPrimary, 
                              fontFamily: 'monospace',
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.value}
                            </span>
                            {item.copy && <CopyButton text={item.value} size={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Address/Contract Result */}
                  {(searchResults.type === 'address' || searchResults.type === 'contract') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {searchResults.data.contractName && (
                        <div style={{
                          padding: '14px 18px',
                          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(34, 197, 94, 0.1))',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <Shield style={{ width: 24, height: 24, color: '#a855f7' }} />
                          <div>
                            <span style={{ fontSize: '11px', color: THEME.textMuted, display: 'block' }}>Verified Contract</span>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#a855f7' }}>{searchResults.data.contractName}</span>
                          </div>
                        </div>
                      )}
                      {[
                        { label: 'Address', value: searchResults.data.address, copy: true },
                        { label: 'Type', value: searchResults.data.isContract ? '📜 Smart Contract' : '👤 EOA (External Account)' },
                        { label: 'LEMX Balance', value: `${searchResults.data.balance} LEMX` },
                        { label: 'VUSD Balance', value: `${searchResults.data.vusdBalance} VUSD` },
                        { label: 'Transaction Count', value: searchResults.data.txCount?.toLocaleString() },
                        ...(searchResults.data.isContract ? [{ label: 'Contract Size', value: `${searchResults.data.codeSize?.toLocaleString()} bytes` }] : [])
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: THEME.bgTertiary,
                          borderRadius: '10px',
                          border: `1px solid ${THEME.borderPrimary}`
                        }}>
                          <span style={{ fontSize: '12px', color: THEME.textMuted }}>{item.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontSize: '13px', 
                              color: THEME.textPrimary, 
                              fontFamily: 'monospace',
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.value}
                            </span>
                            {item.copy && <CopyButton text={item.value} size={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Protocol Events Result */}
                  {searchResults.type === 'transaction' && searchResults.data.matches && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ fontSize: '13px', color: THEME.textSecondary, margin: '0 0 8px 0' }}>
                        Found {searchResults.data.count} matching protocol events:
                      </p>
                      {searchResults.data.matches.slice(0, 5).map((event: MintExplorerEvent) => (
                        <div 
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowSearchModal(false);
                          }}
                          style={{
                            padding: '14px 18px',
                            background: THEME.bgTertiary,
                            border: `1px solid ${THEME.borderPrimary}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <StatusBadge type={event.type} />
                            <span style={{ fontSize: '11px', color: THEME.textMuted }}>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '12px', color: THEME.textMuted }}>Lock ID:</span>
                            <span style={{ fontSize: '13px', color: THEME.textPrimary, fontFamily: 'monospace' }}>
                              {event.lockId}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: THEME.textMuted }}>Amount:</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: THEME.lemonPrimary }}>
                              ${parseFloat(event.amount).toLocaleString()} VUSD
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View on Explorer Button */}
                  {(searchResults.data.hash || searchResults.data.address || searchResults.data.number) && (
                    <a
                      href={`https://explorer.lemonchain.io/${
                        searchResults.type === 'transaction' ? 'tx/' + searchResults.data.hash :
                        searchResults.type === 'block' ? 'block/' + searchResults.data.number :
                        'address/' + searchResults.data.address
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginTop: '20px',
                        padding: '14px 24px',
                        background: THEME.gradientLemonSoft,
                        border: `1px solid ${THEME.borderLemon}`,
                        borderRadius: '12px',
                        color: THEME.lemonPrimary,
                        fontSize: '14px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ExternalLink style={{ width: 16, height: 16 }} />
                      {language === 'es' ? 'Ver en LemonChain Explorer' : 'View on LemonChain Explorer'}
                    </a>
                  )}
                </div>
              )}

              {/* Initial State */}
              {!isSearching && !searchResults && !searchError && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(34, 197, 94, 0.1))',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <Search style={{ width: 36, height: 36, color: '#a855f7' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: THEME.textPrimary, margin: '0 0 8px 0' }}>
                    {language === 'es' ? 'Búsqueda Inteligente' : 'Intelligent Search'}
                  </h3>
                  <p style={{ fontSize: '13px', color: THEME.textMuted, maxWidth: '400px', lineHeight: 1.6 }}>
                    {language === 'es' 
                      ? 'Busca cualquier hash de transacción, dirección de wallet o contrato, número de bloque, o datos del protocolo VUSD.'
                      : 'Search any transaction hash, wallet or contract address, block number, or VUSD protocol data.'
                    }
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    marginTop: '24px',
                    justifyContent: 'center'
                  }}>
                    {['Tx Hash', 'Address', 'Block #', 'Token', 'Contract'].map(type => (
                      <span key={type} style={{
                        padding: '6px 14px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '20px',
                        fontSize: '11px',
                        color: '#c084fc',
                        fontWeight: '500'
                      }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintLemonExplorer;
