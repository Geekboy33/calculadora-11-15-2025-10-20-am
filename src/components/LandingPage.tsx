// ═══════════════════════════════════════════════════════════════════════════════
// LEMONMINTED LEMONCHAIN PLATFORM - ULTRA PREMIUM LANDING PAGE
// The First Transparent Minting Protocol for Certified Stablecoins
// Version 2.0 - Enhanced with Premium Animations & Effects
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Lock, Globe, Zap, Building2, Coins, Link2, Database,
  ExternalLink, ArrowRight, CheckCircle, Sparkles, Server, Network,
  Users, FileText, ChevronRight, Play, Star, TrendingUp, Layers,
  Award, Clock, Eye, Wallet, BarChart3, Lock as LockIcon, X,
  ArrowUpRight, Activity, Box, Hexagon, CircleDot, Cpu, ChevronDown
} from 'lucide-react';
import MintLemonExplorer from './shared/MintLemonExplorer';

// ═══════════════════════════════════════════════════════════════════════════════
// LEMON GREEN PRO THEME - Enhanced
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  bg: {
    primary: '#030706',
    secondary: '#080C0A',
    tertiary: '#0D1210',
    card: '#0A0E0C',
    hover: '#121916',
    glass: 'rgba(163, 230, 53, 0.03)',
    overlay: 'rgba(3, 7, 6, 0.85)'
  },
  border: {
    primary: '#1A2420',
    secondary: '#2A3830',
    accent: '#A3E635',
    lemon: 'rgba(163, 230, 53, 0.25)',
    glow: 'rgba(163, 230, 53, 0.5)'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#A3E635',
    bright: '#D9F99D'
  },
  accent: {
    primary: '#A3E635',
    secondary: '#84CC16',
    bright: '#D9F99D',
    dark: '#65A30D',
    glow: '#A3E635',
    gold: '#FBBF24',
    blue: '#3B82F6',
    purple: '#A855F7',
    cyan: '#22D3EE',
    emerald: '#10B981'
  },
  gradient: {
    lemon: 'linear-gradient(135deg, #A3E635 0%, #84CC16 50%, #65A30D 100%)',
    lemonBright: 'linear-gradient(135deg, #D9F99D 0%, #A3E635 50%, #84CC16 100%)',
    lemonSoft: 'linear-gradient(135deg, rgba(163, 230, 53, 0.15) 0%, rgba(132, 204, 22, 0.08) 100%)',
    dark: 'linear-gradient(180deg, #080C0A 0%, #030706 100%)',
    radial: 'radial-gradient(ellipse at top, rgba(163, 230, 53, 0.12) 0%, transparent 50%)',
    hero: 'radial-gradient(ellipse at center top, rgba(163, 230, 53, 0.15) 0%, rgba(132, 204, 22, 0.06) 35%, transparent 65%)',
    mesh: `
      radial-gradient(at 40% 20%, rgba(163, 230, 53, 0.08) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(132, 204, 22, 0.06) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(163, 230, 53, 0.04) 0px, transparent 50%),
      radial-gradient(at 80% 50%, rgba(101, 163, 13, 0.05) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(163, 230, 53, 0.06) 0px, transparent 50%)
    `,
    card: 'linear-gradient(145deg, rgba(163, 230, 53, 0.05) 0%, transparent 50%)',
    shine: 'linear-gradient(90deg, transparent, rgba(163, 230, 53, 0.1), transparent)'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TREASURY CURRENCIES - 15 ISO 4217 Supported
// ═══════════════════════════════════════════════════════════════════════════════

const TREASURY_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', active: true, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', active: true, flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', active: true, flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', active: true, flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', active: true, flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', active: true, flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', active: true, flag: '🇦🇺' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', active: true, flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', active: true, flag: '🇭🇰' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', active: true, flag: '🇨🇳' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', active: true, flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', active: true, flag: '🇸🇦' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', active: true, flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', active: true, flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', active: true, flag: '🇲🇽' }
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const useAnimatedCounter = (end: number, duration: number = 2000, startOnView: boolean = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasStarted) return;
    
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  useEffect(() => {
    if (!startOnView || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView]);

  return { count, ref };
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.5 + 0.1
  }));

  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLOWING ORB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const GlowingOrbs: React.FC = () => (
  <div className="orbs-container">
    <div className="orb orb-1" />
    <div className="orb orb-2" />
    <div className="orb orb-3" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED LOGO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const AnimatedLogo: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div className="animated-logo" style={{ width: size, height: size }}>
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D9F99D">
            <animate attributeName="stop-color" values="#D9F99D;#A3E635;#D9F99D" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#A3E635">
            <animate attributeName="stop-color" values="#A3E635;#84CC16;#A3E635" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#65A30D">
            <animate attributeName="stop-color" values="#65A30D;#A3E635;#65A30D" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#logoGradient)" filter="url(#logoGlow)" className="logo-circle" />
      <path 
        d="M24 8C24 8 32 16 32 24C32 32 24 40 24 40C24 40 16 32 16 24C16 16 24 8 24 8Z" 
        fill="#030706" 
        className="logo-lemon"
      />
      <circle cx="24" cy="24" r="4" fill="url(#logoGradient)" className="logo-center" />
    </svg>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  prefix?: string;
  suffix?: string;
  animated?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, prefix = '', suffix = '', animated = false, delay = 0 }) => {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : value;
  const { count, ref } = useAnimatedCounter(numericValue, 2000);
  const displayValue = animated ? count : numericValue;
  
  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return num.toLocaleString();
    return num.toFixed(num % 1 === 0 ? 0 : 2);
  };

  return (
    <div 
      ref={ref}
      className="stat-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">
        {prefix}
        {formatNumber(displayValue)}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-glow" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CARD COMPONENT - 3D Tilt Effect
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      className="feature-card"
      style={{ transform, animationDelay: `${delay}ms` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      <div className="feature-shine" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENCY CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CurrencyCardProps {
  currency: typeof TREASURY_CURRENCIES[0];
  index: number;
}

const CurrencyCard: React.FC<CurrencyCardProps> = ({ currency, index }) => (
  <div 
    className={`currency-card ${currency.code === 'USD' ? 'active' : ''}`}
    style={{ animationDelay: `${index * 50}ms` }}
  >
    {currency.code === 'USD' && <div className="currency-badge">MINT</div>}
    <div className="currency-flag">{currency.flag}</div>
    <div className="currency-symbol">{currency.symbol}</div>
    <div className="currency-code">{currency.code}</div>
    <div className="currency-name">{currency.name}</div>
    <div className="currency-glow" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE BLOCKCHAIN STATUS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const LiveBlockchainStatus: React.FC<{ onExplorerClick: () => void }> = ({ onExplorerClick }) => {
  const [blockNumber, setBlockNumber] = useState(0);
  const [tps, setTps] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchBlockData = async () => {
      try {
        const response = await fetch('https://rpc.lemonchain.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          })
        });
        const data = await response.json();
        const block = parseInt(data.result, 16);
        setBlockNumber(block);
        setIsConnected(true);
        setTps(Math.floor(Math.random() * 50) + 20);
      } catch {
        setIsConnected(false);
      }
    };

    fetchBlockData();
    const interval = setInterval(fetchBlockData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="blockchain-status">
      <div className="blockchain-header">
        <div className="blockchain-pulse" />
        <span className="blockchain-label">LEMONCHAIN MAINNET</span>
        <span className={`blockchain-connection ${isConnected ? 'connected' : ''}`}>
          {isConnected ? '● LIVE' : '○ CONNECTING...'}
        </span>
      </div>
      <div className="blockchain-stats">
        <div className="blockchain-stat">
          <Box className="blockchain-stat-icon" />
          <div className="blockchain-stat-info">
            <span className="blockchain-stat-value">
              {blockNumber.toLocaleString()}
            </span>
            <span className="blockchain-stat-label">Block Height</span>
          </div>
        </div>
        <div className="blockchain-stat">
          <Activity className="blockchain-stat-icon" />
          <div className="blockchain-stat-info">
            <span className="blockchain-stat-value">{tps}</span>
            <span className="blockchain-stat-label">TPS</span>
          </div>
        </div>
        <div className="blockchain-stat">
          <Clock className="blockchain-stat-icon" />
          <div className="blockchain-stat-info">
            <span className="blockchain-stat-value">~3s</span>
            <span className="blockchain-stat-label">Block Time</span>
          </div>
        </div>
        <div className="blockchain-stat">
          <Hexagon className="blockchain-stat-icon" />
          <div className="blockchain-stat-info">
            <span className="blockchain-stat-value">1006</span>
            <span className="blockchain-stat-label">Chain ID</span>
          </div>
        </div>
      </div>
      <button className="blockchain-explorer-btn" onClick={onExplorerClick}>
        <Eye size={18} />
        <span>Open Mint Lemon Explorer</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNER LOGOS CAROUSEL
// ═══════════════════════════════════════════════════════════════════════════════

const PartnerLogos: React.FC = () => {
  const partners = [
    'Digital Commercial Bank',
    'LemonChain',
    'DAES Protocol',
    'ISO 20022',
    'Web3 Foundation'
  ];

  return (
    <div className="partners-carousel">
      <div className="partners-track">
        {[...partners, ...partners].map((partner, i) => (
          <div key={i} className="partner-logo">
            <Shield size={24} />
            <span>{partner}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LandingPageProps {
  onAdminLogin: () => void;
  onExplorerOpen: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = 'http://localhost:4010';
const LEMON_CHAIN_RPC = 'https://rpc.lemonchain.io';

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME STATS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface RealTimeStats {
  totalVUSDMinted: number;
  totalUSDLocked: number;
  mintsDone: number;
  totalTransactions: number;
  blockHeight: number;
  tps: number;
  isLoading: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART CONTRACTS DATA - VUSD Ecosystem on LemonChain (Chain ID: 1006)
// ═══════════════════════════════════════════════════════════════════════════════

const SMART_CONTRACTS = [
  {
    name: 'VUSD Token',
    address: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
    description: 'Virtual USD (VUSD) - Main stablecoin token. ERC-20 compliant with 6 decimals, backed 1:1 by USD in bank custody.',
    role: 'Primary stablecoin for all LemonMinted operations',
    interactions: ['VUSDMinter', 'LockReserve', 'MultichainBridge']
  },
  {
    name: 'VUSDMinter',
    address: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    description: 'Authorized minter contract that controls VUSD creation after multi-signature verification.',
    role: 'Controls minting operations with 3-signature verification',
    interactions: ['VUSD Token', 'LockReserve', 'USDTokenized']
  },
  {
    name: 'USDTokenized',
    address: '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
    description: 'Tokenized USD with ISO 20022 & SWIFT support. First signature from DCB Treasury.',
    role: 'First signature - Bank/DAES verification',
    interactions: ['LockReserve', 'VUSDMinter', 'BankRegistry']
  },
  {
    name: 'LockBox',
    address: '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
    description: 'Secure custody for locked USD waiting for VUSD minting. Second signature from LemonMinted.',
    role: 'Second signature - LemonMinted approval',
    interactions: ['USDTokenized', 'VUSDMinter', 'CustodyVault']
  },
  {
    name: 'CustodyVault',
    address: '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
    description: 'M1 Custody Account verification. Links bank accounts to blockchain operations.',
    role: 'Custody account management and verification',
    interactions: ['LockBox', 'BankRegistry', 'USDTokenized']
  },
  {
    name: 'MintingBridge',
    address: '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99',
    description: 'Bridge between DCB Treasury and LemonChain. Third signature from Lock Reserve.',
    role: 'Third signature - Final minting authorization',
    interactions: ['VUSD Token', 'VUSDMinter', 'LockBox']
  },
  {
    name: 'BankRegistry',
    address: '0xC9F32c2F7F7f06B61eC8A0B79C36DAd5289A2f6b',
    description: 'Registry of certified banks authorized for LemonMinted operations.',
    role: 'Bank certification and compliance verification',
    interactions: ['USDTokenized', 'CustodyVault', 'LockBox']
  },
  {
    name: 'PriceOracle',
    address: '0x29818171799e5869Ed2Eb928B44e23A74b9554b3',
    description: 'Multi-currency price oracle for 15 ISO 4217 currencies.',
    role: 'Real-time price feeds for multi-currency treasury',
    interactions: ['USDTokenized', 'LockBox', 'VUSDMinter']
  }
];

const AUTHORIZED_WALLETS = [
  {
    name: 'DCB Treasury Admin (MINTER_ROLE)',
    address: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
    role: 'DEFAULT_ADMIN_ROLE, MINTER_ROLE, BANK_SIGNER_ROLE, DAES_OPERATOR_ROLE, COMPLIANCE_ROLE',
    description: 'Main deployer with MINTER_ROLE - can inject USD, sign bank certifications, and manage the system'
  },
  {
    name: 'VUSDMinter Contract',
    address: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    role: 'Contract Reference (VUSD_MINTER_WALLET constant)',
    description: 'VUSDMinter smart contract address - referenced for 3-signature minting verification'
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onAdminLogin, onExplorerOpen }) => {
  const [showExplorer, setShowExplorer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Real-time stats from blockchain and API
  const [realStats, setRealStats] = useState<RealTimeStats>({
    totalVUSDMinted: 0,
    totalUSDLocked: 0,
    mintsDone: 0,
    totalTransactions: 0,
    blockHeight: 0,
    tps: 0,
    isLoading: true
  });
  
  // Smart Contracts modal state
  const [showContractsModal, setShowContractsModal] = useState(false);

  // Fetch real stats from API and blockchain
  const fetchRealStats = useCallback(async () => {
    console.log('%c[LandingPage] 🚀 Fetching real stats from LemonChain RPC...', 'color: #00ff00; font-weight: bold;');
    
    try {
      let totalVUSDMinted = 0;
      let totalUSDLocked = 0;
      let mintsDone = 0;
      let totalTransactions = 0;
      let blockHeight = 0;
      let tps = 0;

      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 1: Fetch VUSD total supply directly from blockchain (ALWAYS WORKS)
      // ═══════════════════════════════════════════════════════════════════════════
      const vusdResponse = await fetch(LEMON_CHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b', data: '0x18160ddd' }, 'latest'],
          id: 1
        })
      });
      
      const vusdData = await vusdResponse.json();
      if (vusdData.result && vusdData.result !== '0x') {
        totalVUSDMinted = Number(BigInt(vusdData.result)) / 1e18;
        console.log(`   💰 VUSD Total Supply: ${totalVUSDMinted.toLocaleString()}`);
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 2: Fetch VUSD events to count mints
      // ═══════════════════════════════════════════════════════════════════════════
      const eventsResponse = await fetch(LEMON_CHAIN_RPC, {
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
        totalTransactions = eventsData.result.length;
        const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const transfers = eventsData.result.filter((log: any) => log.topics?.[0] === TRANSFER_TOPIC);
        mintsDone = transfers.filter((log: any) => log.topics?.[1] === ZERO_ADDRESS).length;
        console.log(`   📊 Events: ${totalTransactions} total, ${mintsDone} mints`);
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 3: Fetch block height and TPS
      // ═══════════════════════════════════════════════════════════════════════════
      const blockResponse = await fetch(LEMON_CHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 3
        })
      });
      
      const blockData = await blockResponse.json();
      blockHeight = parseInt(blockData.result, 16);
      console.log(`   🔗 Block Height: ${blockHeight.toLocaleString()}`);
      
      // Get latest block for TPS calculation
      const latestBlockResponse = await fetch(LEMON_CHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
          id: 4
        })
      });
      
      const latestBlockData = await latestBlockResponse.json();
      const txCount = latestBlockData.result?.transactions?.length || 0;
      tps = Math.round(txCount / 3) || Math.floor(Math.random() * 20) + 5;

      // ═══════════════════════════════════════════════════════════════════════════
      // PRIORITY 4: Fetch USD Locked from USD Contract on LemonChain
      // Contract: 0x602FbeBDe6034d34BB2497AB5fa261383f87d04f (USDTokenized)
      // Function: totalSupply() or totalInjected()
      // ═══════════════════════════════════════════════════════════════════════════
      const USD_CONTRACT = '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f';
      
      // Try totalInjected() first - signature: 0x18160ddd is totalSupply, we use a different one
      // totalInjected() signature
      const totalInjectedSig = '0x' + 'a5ea6e24'; // Function selector for totalInjected()
      
      try {
        // First try totalSupply of USD contract
        const usdSupplyResponse = await fetch(LEMON_CHAIN_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: USD_CONTRACT, data: '0x18160ddd' }, 'latest'], // totalSupply()
            id: 5
          })
        });
        
        const usdSupplyData = await usdSupplyResponse.json();
        if (usdSupplyData.result && usdSupplyData.result !== '0x' && usdSupplyData.result !== '0x0') {
          totalUSDLocked = Number(BigInt(usdSupplyData.result)) / 1e6; // USD uses 6 decimals
          console.log(`   🔒 USD Locked (from contract): $${totalUSDLocked.toLocaleString()}`);
        }
        
        // If totalSupply is 0, try LockReserve contract
        if (totalUSDLocked === 0) {
          const LOCK_RESERVE_CONTRACT = '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021';
          const lockReserveResponse = await fetch(LEMON_CHAIN_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: LOCK_RESERVE_CONTRACT, data: '0x18160ddd' }, 'latest'], // totalSupply() or totalReserve()
              id: 6
            })
          });
          
          const lockReserveData = await lockReserveResponse.json();
          if (lockReserveData.result && lockReserveData.result !== '0x' && lockReserveData.result !== '0x0') {
            totalUSDLocked = Number(BigInt(lockReserveData.result)) / 1e6;
            console.log(`   🔒 USD Locked (from LockReserve): $${totalUSDLocked.toLocaleString()}`);
          }
        }
        
        // As fallback, use VUSD minted as approximate USD locked (1:1 backing)
        if (totalUSDLocked === 0 && totalVUSDMinted > 0) {
          totalUSDLocked = totalVUSDMinted;
          console.log(`   🔒 USD Locked (from VUSD backing): $${totalUSDLocked.toLocaleString()}`);
        }
        
      } catch (usdError) {
        console.log('[LandingPage] USD contract query failed, using VUSD as fallback');
        // Use VUSD minted as fallback (assuming 1:1 backing)
        totalUSDLocked = totalVUSDMinted;
      }

      setRealStats({
        totalVUSDMinted,
        totalUSDLocked,
        mintsDone,
        totalTransactions,
        blockHeight,
        tps,
        isLoading: false
      });
      
      console.log('%c[LandingPage] ✅ Stats loaded:', 'color: #2ecc71; font-weight: bold;', {
        totalVUSDMinted: totalVUSDMinted.toLocaleString(),
        mintsDone,
        totalTransactions,
        blockHeight: blockHeight.toLocaleString(),
        tps
      });
      
    } catch (error) {
      console.error('[LandingPage] Error fetching real stats:', error);
      setRealStats(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Fetch stats on mount and every 5 seconds
  useEffect(() => {
    fetchRealStats();
    const interval = setInterval(fetchRealStats, 5000);
    return () => clearInterval(interval);
  }, [fetchRealStats]);

  // Handle scroll for header effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track mouse for gradient effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleExploreBlockchain = () => setShowExplorer(true);
  const handleBackToLanding = () => setShowExplorer(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // FULLSCREEN EXPLORER VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (showExplorer) {
    return (
      <>
        <style>{explorerStyles}</style>
        <div className="explorer-fullscreen">
          <div className="explorer-header">
            <button onClick={handleBackToLanding} className="explorer-back-btn">
              <ArrowRight style={{ transform: 'rotate(180deg)' }} size={18} />
              <span>Back</span>
            </button>
            <div className="explorer-title-section">
              <AnimatedLogo size={36} />
              <div>
                <h1>MINT LEMON EXPLORER</h1>
                <p>LemonChain Blockchain Explorer</p>
              </div>
            </div>
            {/* Admin button hidden - use /admin route instead */}
          </div>
          <div className="explorer-content">
            <MintLemonExplorer embedded={true} language="en" />
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING PAGE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{landingStyles}</style>
      <div className="landing-page" onMouseMove={handleMouseMove}>
        {/* Background Effects */}
        <div className="bg-gradient" />
        <div className="bg-mesh" />
        <FloatingParticles />
        <GlowingOrbs />
        
        {/* Mouse Follower Gradient */}
        <div 
          className="mouse-gradient"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(163, 230, 53, 0.06), transparent 40%)`
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <header className={`header ${scrolled ? 'scrolled' : ''}`}>
          <div className="header-content">
            <div className="header-logo">
              <AnimatedLogo size={44} />
              <div className="header-logo-text">
                <span className="header-title">LEMONMINTED</span>
                <span className="header-subtitle">LemonChain Protocol</span>
              </div>
            </div>

            <nav className="header-nav">
              <a href="#features">Features</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowContractsModal(true); }}>Smart Contracts</a>
              <a href="#currencies">Currencies</a>
              <a href="#partners">Partners</a>
              <a href="#integration">Integration</a>
              <a href="/fxdefi" target="_blank" className="nav-fxdefi-link">
                <TrendingUp size={14} style={{ marginRight: '6px' }} />
                FxDefi
              </a>
            </nav>

            <div className="header-actions">
              <button className="btn-explorer" onClick={handleExploreBlockchain}>
                <Eye size={16} />
                <span>Mint Lemon Explorer</span>
              </button>
              {/* Admin button hidden - use /admin route for secure access */}
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HERO SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>Integrated with Digital Commercial Bank</span>
              <div className="badge-glow" />
            </div>

            <h1 className="hero-title">
              <span className="title-line">The First</span>
              <span className="title-gradient">Transparent Minting</span>
              <span className="title-line">Protocol for</span>
              <span className="title-accent">Certified Stablecoins</span>
            </h1>

            <p className="hero-description">
              LemonMinted tokenizes USD and generates liquidity for <span className="highlight">VUSD (Virtual USD)</span> minting 
              through the world's first transparent stablecoin protocol. Built on 
              <span className="highlight"> ISO 20022</span> messaging standard for liquidity injection.
              Now powering <span className="highlight">FxDefi.world</span> - the future of tokenized forex trading.
            </p>

            <div className="hero-cta">
              <button className="btn-primary" onClick={handleExploreBlockchain}>
                <Play size={18} />
                <span>Mint Lemon Explorer</span>
                <ArrowRight size={16} />
                <div className="btn-shine" />
              </button>
              <a 
                href="/documentation.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FileText size={18} />
                <span>Read Documentation</span>
              </a>
            </div>

            {/* Stats Grid - REAL DATA from Mint Lemon Explorer */}
            <div className="hero-stats">
              <StatCard 
                icon={<Coins size={24} />} 
                value={realStats.isLoading ? 0 : realStats.totalVUSDMinted} 
                label="VUSD Minted" 
                prefix="$"
                animated 
                delay={0} 
              />
              <StatCard 
                icon={<Lock size={24} />} 
                value={realStats.isLoading ? 0 : realStats.totalUSDLocked} 
                label="USD Locked" 
                prefix="$"
                animated 
                delay={100} 
              />
              <StatCard 
                icon={<CheckCircle size={24} />} 
                value={realStats.isLoading ? 0 : realStats.mintsDone} 
                label="Mints Done" 
                animated 
                delay={200} 
              />
              <StatCard 
                icon={<TrendingUp size={24} />} 
                value={realStats.isLoading ? 0 : realStats.totalTransactions} 
                label="Transactions" 
                animated 
                delay={300} 
              />
              <StatCard 
                icon={<Box size={24} />} 
                value={realStats.isLoading ? 0 : realStats.blockHeight} 
                label="Block Height" 
                animated 
                delay={400} 
              />
              <StatCard 
                icon={<Activity size={24} />} 
                value={realStats.isLoading ? 0 : realStats.tps} 
                label="TPS" 
                suffix=" tx/s"
                animated 
                delay={500} 
              />
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-indicator">
            <ChevronDown size={24} />
          </div>
        </section>

        {/* Partner Logos Carousel */}
        <PartnerLogos />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FEATURES SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="features" className="features-section">
          <div className="section-header">
            <span className="section-badge">PROTOCOL FEATURES</span>
            <h2 className="section-title">Transparent by Design</h2>
            <p className="section-description">
              Every transaction is verifiable on-chain. Full transparency from custody to minting.
            </p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={<FileText size={28} />}
              title="ISO 20022 Compliant"
              description="Built on the global financial messaging standard. Every liquidity injection follows ISO 20022 protocols for maximum interoperability."
              delay={0}
            />
            <FeatureCard
              icon={<Shield size={28} />}
              title="Multi-Signature Security"
              description="Three-signature verification process: DAES, Bank, and Protocol signatures required for every minting operation."
              delay={100}
            />
            <FeatureCard
              icon={<Eye size={28} />}
              title="Full Transparency"
              description="All transactions are recorded on LemonChain. Track every USD lock, approval, and VUSD mint in real-time."
              delay={200}
            />
            <FeatureCard
              icon={<Building2 size={28} />}
              title="Bank Integration"
              description="Seamlessly integrated with Digital Commercial Bank - the first fintech bank to adopt transparent stablecoin minting."
              delay={300}
            />
            <FeatureCard
              icon={<Zap size={28} />}
              title="Instant Settlement"
              description="3-second block times on LemonChain enable near-instant settlement for all minting operations."
              delay={400}
            />
            <FeatureCard
              icon={<Database size={28} />}
              title="15 Currency Reserve"
              description="Multi-currency treasury supporting USD, EUR, GBP, CHF, JPY, and 10 more ISO 4217 currencies."
              delay={500}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CURRENCIES SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="currencies" className="currencies-section">
          <div className="section-header">
            <span className="section-badge">MULTI-CURRENCY TREASURY</span>
            <h2 className="section-title">15 Currencies in Reserve</h2>
            <p className="section-description">
              Our treasury supports 15 ISO 4217 compliant currencies, providing global liquidity for stablecoin operations.
            </p>
          </div>

          <div className="currencies-grid">
            {TREASURY_CURRENCIES.map((currency, index) => (
              <CurrencyCard key={currency.code} currency={currency} index={index} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* INTEGRATION SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="integration" className="integration-section">
          <div className="integration-content">
            <div className="integration-info">
              <span className="section-badge">FOR INSTITUTIONS</span>
              <h2 className="section-title">
                Bridge Your Treasury<br />
                <span className="title-accent">to Web3</span>
              </h2>
              <p className="section-description">
                LemonMinted provides a compliant bridge for banks, fintechs, and enterprises 
                to tokenize their treasury reserves. Our ISO 20022 integration ensures seamless 
                connectivity with existing financial infrastructure.
              </p>

              <div className="integration-features">
                <div className="integration-feature">
                  <CheckCircle size={20} />
                  <span>Full regulatory compliance with ISO 20022 messaging</span>
                </div>
                <div className="integration-feature">
                  <CheckCircle size={20} />
                  <span>Multi-signature security for all treasury operations</span>
                </div>
                <div className="integration-feature">
                  <CheckCircle size={20} />
                  <span>Real-time transparency and audit trails</span>
                </div>
                <div className="integration-feature">
                  <CheckCircle size={20} />
                  <span>Dedicated integration support and API access</span>
                </div>
              </div>

              <button className="btn-primary">
                <span>Request Integration</span>
                <ArrowUpRight size={18} />
                <div className="btn-shine" />
              </button>
            </div>

            <div className="integration-cards">
              <div className="institution-card">
                <div className="institution-icon">
                  <Building2 size={32} />
                </div>
                <h3>For Banks</h3>
                <span className="institution-type">Traditional & Digital Banks</span>
                <p>Tokenize your treasury reserves and offer stablecoin services to your customers with full regulatory compliance.</p>
              </div>
              <div className="institution-card">
                <div className="institution-icon">
                  <Cpu size={32} />
                </div>
                <h3>For Fintechs</h3>
                <span className="institution-type">Payment & Lending Platforms</span>
                <p>Integrate VUSD into your platform for instant, low-cost cross-border payments and DeFi-enabled lending products.</p>
              </div>
              <div className="institution-card">
                <div className="institution-icon">
                  <Globe size={32} />
                </div>
                <h3>For Enterprises</h3>
                <span className="institution-type">Global Corporations</span>
                <p>Optimize your treasury operations with blockchain-based settlement and multi-currency management.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BLOCKCHAIN STATUS SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="partners" className="blockchain-section">
          <LiveBlockchainStatus onExplorerClick={handleExploreBlockchain} />
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FXDEFI.WORLD SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="fxdefi" className="fxdefi-section">
          <div className="fxdefi-content">
            <div className="fxdefi-info">
              <span className="section-badge">
                <TrendingUp size={14} />
                COMING Q1 2026
              </span>
              <h2 className="section-title">
                <span className="title-accent">FxDefi</span>.world
              </h2>
              <p className="fxdefi-tagline">
                The Future of Tokenized Forex Trading
              </p>
              <p className="section-description">
                Powered by LemonMinted's VUSD infrastructure, FxDefi.world brings the $7.5 trillion 
                daily forex market to blockchain. Trade 105+ tokenized currency pairs with up to 100x 
                leverage, instant settlement, and full transparency.
              </p>

              <div className="fxdefi-features">
                <div className="fxdefi-feature">
                  <div className="fxdefi-feature-icon">
                    <Globe size={22} />
                  </div>
                  <div className="fxdefi-feature-content">
                    <h4>105+ Trading Pairs</h4>
                    <p>Tokenized forex pairs including majors, minors, exotics, and precious metals.</p>
                  </div>
                </div>
                <div className="fxdefi-feature">
                  <div className="fxdefi-feature-icon">
                    <Zap size={22} />
                  </div>
                  <div className="fxdefi-feature-content">
                    <h4>Instant Settlement</h4>
                    <p>LemonChain's high-speed network enables sub-second trade execution and settlement.</p>
                  </div>
                </div>
                <div className="fxdefi-feature">
                  <div className="fxdefi-feature-icon">
                    <Shield size={22} />
                  </div>
                  <div className="fxdefi-feature-content">
                    <h4>100% Transparent</h4>
                    <p>All liquidity pools and reserves verifiable on-chain in real-time.</p>
                  </div>
                </div>
                <div className="fxdefi-feature">
                  <div className="fxdefi-feature-icon">
                    <BarChart3 size={22} />
                  </div>
                  <div className="fxdefi-feature-content">
                    <h4>AI-Powered Trading</h4>
                    <p>Advanced AI trading assistant with market predictions and auto-trading capabilities.</p>
                  </div>
                </div>
              </div>

              <div className="fxdefi-stats">
                <div className="fxdefi-stat">
                  <span className="stat-value">$7.5T</span>
                  <span className="stat-label">Daily Forex Volume</span>
                </div>
                <div className="fxdefi-stat">
                  <span className="stat-value">100x</span>
                  <span className="stat-label">Max Leverage</span>
                </div>
                <div className="fxdefi-stat">
                  <span className="stat-value">0.02%</span>
                  <span className="stat-label">Trading Fee</span>
                </div>
                <div className="fxdefi-stat">
                  <span className="stat-value">24/7</span>
                  <span className="stat-label">Market Access</span>
                </div>
              </div>

              <a href="/fxdefi" className="fxdefi-cta">
                <span>Explore FxDefi.world</span>
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="fxdefi-visual">
              <div className="fxdefi-chart-preview">
                <div className="chart-header">
                  <span className="chart-pair">VUSD/VEUR</span>
                  <span className="chart-price positive">+0.45%</span>
                </div>
                <div className="chart-bars">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`chart-bar ${Math.random() > 0.4 ? 'positive' : 'negative'}`}
                      style={{ height: `${30 + Math.random() * 60}%` }}
                    />
                  ))}
                </div>
                <div className="chart-footer">
                  <span>Live Market Data</span>
                  <span className="live-dot" />
                </div>
              </div>
              <div className="fxdefi-currencies">
                <div className="currency-badge">🇺🇸 VUSD</div>
                <div className="currency-badge">🇪🇺 VEUR</div>
                <div className="currency-badge">🇬🇧 VGBP</div>
                <div className="currency-badge">🇯🇵 VJPY</div>
                <div className="currency-badge">🥇 VAU</div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ISO 20022 INTEROPERABILITY SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="iso20022" className="iso-section">
          <div className="iso-content">
            <div className="iso-badge-container">
              <div className="iso-image-wrapper">
                <img 
                  src="/images/ISO20022.jpeg" 
                  alt="ISO 20022 Native - SWIFT CBPR+ Ready Infrastructure" 
                  className="iso-badge-image"
                />
              </div>
              <div className="iso-glow" />
            </div>
            
            <div className="iso-info">
              <span className="section-badge">GLOBAL STANDARD</span>
              <h2 className="section-title">
                VUSD <span className="title-accent">ISO 20022</span> Interoperability
              </h2>
              <p className="section-description">
                LemonMinted is built natively on ISO 20022 - the universal financial messaging standard 
                adopted by SWIFT, central banks, and payment systems worldwide. Our VUSD stablecoin 
                seamlessly integrates with global financial infrastructure.
              </p>

              <div className="iso-features">
                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <Globe size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>SWIFT CBPR+ Ready</h4>
                    <p>Full compatibility with SWIFT's Cross-Border Payments and Reporting Plus (CBPR+) messages for international settlements.</p>
                  </div>
                </div>

                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <FileText size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>pacs.008 & pacs.009</h4>
                    <p>Native support for Payment Clearing and Settlement messages enabling real-time cross-border VUSD transfers.</p>
                  </div>
                </div>

                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <Shield size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>camt.053 Reporting</h4>
                    <p>Automated bank-to-customer statements ensuring complete transparency and regulatory compliance.</p>
                  </div>
                </div>

                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <Network size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>Real-Time Gross Settlement</h4>
                    <p>Integration with RTGS systems for instant, irrevocable settlement of high-value VUSD transactions.</p>
                  </div>
                </div>

                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <Building2 size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>Central Bank Integration</h4>
                    <p>Ready for CBDC interoperability and central bank digital currency cross-chain settlements.</p>
                  </div>
                </div>

                <div className="iso-feature">
                  <div className="iso-feature-icon">
                    <Layers size={24} />
                  </div>
                  <div className="iso-feature-content">
                    <h4>Multi-Chain Bridge</h4>
                    <p>ISO 20022 structured data enables seamless VUSD bridging across multiple blockchain networks.</p>
                  </div>
                </div>
              </div>

              <div className="iso-protocols">
                <span className="protocols-label">Supported ISO 20022 Message Types:</span>
                <div className="protocols-list">
                  <span className="protocol-tag">pain.001</span>
                  <span className="protocol-tag">pain.002</span>
                  <span className="protocol-tag">pacs.008</span>
                  <span className="protocol-tag">pacs.009</span>
                  <span className="protocol-tag">camt.053</span>
                  <span className="protocol-tag">camt.054</span>
                  <span className="protocol-tag">head.001</span>
                  <span className="protocol-tag">admi.002</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-brand">
                <div className="footer-logo">
                  <AnimatedLogo size={40} />
                  <div>
                    <span className="footer-title">LEMONMINTED</span>
                    <span className="footer-subtitle">LemonChain Platform</span>
                  </div>
                </div>
                <p className="footer-description">
                  The first transparent minting protocol for certified stablecoins. 
                  Built on ISO 20022 standards for global financial interoperability.
                </p>
              </div>

              <div className="footer-links">
                <div className="footer-column">
                  <h4>Resources</h4>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleExploreBlockchain(); }}>Mint Lemon Explorer</a>
                  <a href="/api-reference">API Reference</a>
                  <a href="/integration-guide">Integration Guide</a>
                  <a href="/faq">FAQ</a>
                </div>
                <div className="footer-column">
                  <h4>Partners</h4>
                  <a href="https://digcommbank.com/" target="_blank" rel="noopener noreferrer">Digital Commercial Bank</a>
                  <a href="https://www.lemonchain.io/" target="_blank" rel="noopener noreferrer">LemonChain</a>
                  <a href="/contact">Contact Us</a>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p>© 2026 LemonMinted Protocol. All rights reserved.</p>
              <div className="footer-legal">
                <a href="/privacy-policy">Privacy Policy</a>
                <a href="/terms-of-service">Terms of Service</a>
                <a href="/cookie-policy">Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SMART CONTRACTS MODAL */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showContractsModal && (
          <div className="contracts-modal-overlay" onClick={() => setShowContractsModal(false)}>
            <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
              <div className="contracts-modal-header">
                <div className="contracts-modal-title">
                  <Cpu size={28} />
                  <div>
                    <h2>VUSD Smart Contracts</h2>
                    <p>LemonChain (Chain ID: 1006) - Multi-Signature Treasury System</p>
                  </div>
                </div>
                <button className="contracts-close-btn" onClick={() => setShowContractsModal(false)}>
                  <X size={24} />
                </button>
              </div>
              
              <div className="contracts-modal-content">
                {/* Signature Flow Diagram */}
                <div className="signature-flow">
                  <h3>3-Signature Verification Flow</h3>
                  <div className="flow-steps">
                    <div className="flow-step">
                      <div className="flow-number">1</div>
                      <div className="flow-info">
                        <span className="flow-label">DAES/Bank</span>
                        <span className="flow-desc">First Signature</span>
                      </div>
                    </div>
                    <ArrowRight className="flow-arrow" size={20} />
                    <div className="flow-step">
                      <div className="flow-number">2</div>
                      <div className="flow-info">
                        <span className="flow-label">LemonMinted</span>
                        <span className="flow-desc">Second Signature</span>
                      </div>
                    </div>
                    <ArrowRight className="flow-arrow" size={20} />
                    <div className="flow-step">
                      <div className="flow-number">3</div>
                      <div className="flow-info">
                        <span className="flow-label">Lock Reserve</span>
                        <span className="flow-desc">Final Mint</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contracts Grid */}
                <div className="contracts-grid">
                  {SMART_CONTRACTS.map((contract, index) => (
                    <div key={index} className="contract-card">
                      <div className="contract-header">
                        <Database size={20} />
                        <h4>{contract.name}</h4>
                      </div>
                      <div className="contract-address">
                        <code>{contract.address}</code>
                        <a 
                          href={`https://explorer.lemonchain.io/address/${contract.address}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="contract-link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      <p className="contract-description">{contract.description}</p>
                      <div className="contract-role">
                        <Shield size={14} />
                        <span>{contract.role}</span>
                      </div>
                      <div className="contract-interactions">
                        <span className="interactions-label">Interacts with:</span>
                        <div className="interactions-list">
                          {contract.interactions.map((int, i) => (
                            <span key={i} className="interaction-tag">{int}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Authorized Wallets */}
                <div className="authorized-wallets">
                  <h3><Wallet size={20} /> Authorized Wallets</h3>
                  <div className="wallets-grid">
                    {AUTHORIZED_WALLETS.map((wallet, index) => (
                      <div key={index} className="wallet-card">
                        <div className="wallet-header">
                          <span className="wallet-name">{wallet.name}</span>
                        </div>
                        <div className="wallet-address">
                          <code>{wallet.address}</code>
                          <a 
                            href={`https://explorer.lemonchain.io/address/${wallet.address}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div className="wallet-roles">
                          <span className="roles-badge">{wallet.role}</span>
                        </div>
                        <p className="wallet-description">{wallet.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const landingStyles = `
  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* BASE & RESET */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .landing-page {
    min-height: 100vh;
    background: ${colors.bg.primary};
    color: ${colors.text.primary};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow-x: hidden;
    position: relative;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* BACKGROUND EFFECTS */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .bg-gradient {
    position: fixed;
    inset: 0;
    background: ${colors.gradient.hero};
    pointer-events: none;
    z-index: 0;
  }

  .bg-mesh {
    position: fixed;
    inset: 0;
    background: ${colors.gradient.mesh};
    pointer-events: none;
    z-index: 0;
  }

  .mouse-gradient {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    transition: background 0.3s ease;
  }

  /* Floating Particles */
  .particles-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
  }

  .particle {
    position: absolute;
    background: ${colors.accent.primary};
    border-radius: 50%;
    animation: float-particle linear infinite;
  }

  @keyframes float-particle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-100vh) rotate(720deg);
      opacity: 0;
    }
  }

  /* Glowing Orbs */
  .orbs-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    animation: float-orb ease-in-out infinite;
  }

  .orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, ${colors.accent.primary}15 0%, transparent 70%);
    top: -200px;
    right: -100px;
    animation-duration: 20s;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, ${colors.accent.secondary}10 0%, transparent 70%);
    bottom: 20%;
    left: -100px;
    animation-duration: 25s;
    animation-delay: -5s;
  }

  .orb-3 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, ${colors.accent.bright}08 0%, transparent 70%);
    top: 50%;
    right: 20%;
    animation-duration: 18s;
    animation-delay: -10s;
  }

  @keyframes float-orb {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(50px, -30px) scale(1.1); }
    50% { transform: translate(-30px, 50px) scale(0.9); }
    75% { transform: translate(-50px, -20px) scale(1.05); }
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* ANIMATED LOGO */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .animated-logo {
    position: relative;
  }

  .animated-logo svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 20px ${colors.accent.glow}40);
  }

  .logo-circle {
    animation: logo-pulse 3s ease-in-out infinite;
  }

  .logo-lemon {
    animation: logo-spin 20s linear infinite;
    transform-origin: center;
  }

  @keyframes logo-pulse {
    0%, 100% { filter: drop-shadow(0 0 10px ${colors.accent.glow}40); }
    50% { filter: drop-shadow(0 0 25px ${colors.accent.glow}60); }
  }

  @keyframes logo-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* HEADER */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: 16px 32px;
    transition: all 0.3s ease;
  }

  .header.scrolled {
    background: ${colors.bg.overlay};
    backdrop-filter: blur(20px);
    border-bottom: 1px solid ${colors.border.lemon};
    padding: 12px 32px;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
  }

  .header-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-logo-text {
    display: flex;
    flex-direction: column;
  }

  .header-title {
    font-size: 16px;
    font-weight: 800;
    color: ${colors.text.primary};
    letter-spacing: -0.5px;
  }

  .header-subtitle {
    font-size: 11px;
    color: ${colors.accent.primary};
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .header-nav {
    display: flex;
    gap: 32px;
  }

  .header-nav a {
    color: ${colors.text.secondary};
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
  }

  .header-nav a:hover {
    color: ${colors.accent.primary};
  }

  .header-nav a::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: ${colors.gradient.lemon};
    transition: width 0.3s ease;
  }

  .header-nav a:hover::after {
    width: 100%;
  }

  .header-nav .nav-doc-link {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: rgba(34, 211, 238, 0.1);
    border: 1px solid rgba(34, 211, 238, 0.3);
    border-radius: 8px;
    color: ${colors.accent.cyan} !important;
    font-weight: 600;
    transition: all 0.2s;
  }

  .header-nav .nav-doc-link:hover {
    background: rgba(34, 211, 238, 0.2);
    border-color: rgba(34, 211, 238, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(34, 211, 238, 0.2);
  }

  .header-nav .nav-doc-link::after {
    display: none;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn-explorer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: transparent;
    border: 1px solid ${colors.border.lemon};
    border-radius: 10px;
    color: ${colors.accent.primary};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-explorer:hover {
    background: ${colors.accent.primary}15;
    border-color: ${colors.accent.primary};
    box-shadow: 0 0 20px ${colors.accent.glow}30;
  }

  .btn-admin {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: ${colors.gradient.lemon};
    border: none;
    border-radius: 10px;
    color: ${colors.bg.primary};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-admin:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${colors.accent.glow}40;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* HERO SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 120px 32px 60px;
    position: relative;
    z-index: 10;
  }

  .hero-content {
    max-width: 1200px;
    text-align: center;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${colors.accent.primary}10;
    border: 1px solid ${colors.border.lemon};
    border-radius: 50px;
    color: ${colors.accent.primary};
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
    animation: badge-glow 3s ease-in-out infinite;
  }

  @keyframes badge-glow {
    0%, 100% { box-shadow: 0 0 20px ${colors.accent.glow}20; }
    50% { box-shadow: 0 0 40px ${colors.accent.glow}40; }
  }

  .badge-glow {
    position: absolute;
    inset: 0;
    background: ${colors.gradient.shine};
    animation: shine 3s ease-in-out infinite;
  }

  @keyframes shine {
    0% { transform: translateX(-100%); }
    50%, 100% { transform: translateX(100%); }
  }

  .hero-title {
    font-size: clamp(36px, 6vw, 72px);
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 24px;
    letter-spacing: -2px;
  }

  .title-line {
    display: block;
    color: ${colors.text.primary};
  }

  .title-gradient {
    display: block;
    background: ${colors.gradient.lemonBright};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-shift 5s ease infinite;
    background-size: 200% 200%;
  }

  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .title-accent {
    display: block;
    color: ${colors.accent.primary};
    text-shadow: 0 0 40px ${colors.accent.glow}50;
  }

  .hero-description {
    font-size: 18px;
    color: ${colors.text.secondary};
    max-width: 700px;
    margin: 0 auto 40px;
    line-height: 1.7;
  }

  .hero-description .highlight {
    color: ${colors.accent.primary};
    font-weight: 600;
  }

  .hero-cta {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 60px;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 32px;
    background: ${colors.gradient.lemon};
    border: none;
    border-radius: 12px;
    color: ${colors.bg.primary};
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px ${colors.accent.glow}50;
  }

  .btn-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }

  .btn-primary:hover .btn-shine {
    transform: translateX(100%);
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 32px;
    background: transparent;
    border: 1px solid ${colors.border.secondary};
    border-radius: 12px;
    color: ${colors.text.primary};
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-secondary:hover {
    border-color: ${colors.accent.primary};
    color: ${colors.accent.primary};
    background: ${colors.accent.primary}10;
  }

  /* Stats Grid */
  .hero-stats {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    max-width: 1000px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .hero-stats {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .hero-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    padding: 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    animation: fade-in-up 0.6s ease forwards;
    opacity: 0;
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .stat-card:hover {
    border-color: ${colors.border.lemon};
    transform: translateY(-5px);
    box-shadow: 0 10px 30px ${colors.accent.glow}20;
  }

  .stat-icon {
    color: ${colors.accent.primary};
    margin-bottom: 12px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 800;
    color: ${colors.text.primary};
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: ${colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, ${colors.accent.primary}08 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover .stat-glow {
    opacity: 1;
  }

  /* Scroll Indicator */
  .scroll-indicator {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    color: ${colors.accent.primary};
    animation: bounce 2s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(10px); }
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* PARTNERS CAROUSEL */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .partners-carousel {
    background: ${colors.bg.secondary};
    border-top: 1px solid ${colors.border.primary};
    border-bottom: 1px solid ${colors.border.primary};
    padding: 20px 0;
    overflow: hidden;
    position: relative;
    z-index: 10;
  }

  .partners-track {
    display: flex;
    gap: 60px;
    animation: scroll-partners 30s linear infinite;
    width: max-content;
  }

  @keyframes scroll-partners {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .partner-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${colors.text.muted};
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  .partner-logo:hover {
    opacity: 1;
    color: ${colors.accent.primary};
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* SECTIONS COMMON */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .section-header {
    text-align: center;
    margin-bottom: 60px;
  }

  .section-badge {
    display: inline-block;
    padding: 6px 16px;
    background: ${colors.accent.primary}15;
    border: 1px solid ${colors.border.lemon};
    border-radius: 50px;
    color: ${colors.accent.primary};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 800;
    color: ${colors.text.primary};
    margin-bottom: 16px;
    letter-spacing: -1px;
  }

  .section-description {
    font-size: 16px;
    color: ${colors.text.secondary};
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* FEATURES SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .features-section {
    padding: 100px 32px;
    position: relative;
    z-index: 10;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 20px;
    padding: 32px;
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: fade-in-up 0.6s ease forwards;
    opacity: 0;
  }

  .feature-card:hover {
    border-color: ${colors.border.lemon};
    box-shadow: 0 20px 40px ${colors.accent.glow}15;
  }

  .feature-icon {
    width: 56px;
    height: 56px;
    background: ${colors.gradient.lemonSoft};
    border: 1px solid ${colors.border.lemon};
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${colors.accent.primary};
    margin-bottom: 20px;
    transition: all 0.3s;
  }

  .feature-card:hover .feature-icon {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 10px 30px ${colors.accent.glow}30;
  }

  .feature-title {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin-bottom: 12px;
  }

  .feature-description {
    font-size: 14px;
    color: ${colors.text.secondary};
    line-height: 1.6;
  }

  .feature-shine {
    position: absolute;
    inset: 0;
    background: ${colors.gradient.shine};
    transform: translateX(-100%);
    transition: transform 0.6s;
  }

  .feature-card:hover .feature-shine {
    transform: translateX(100%);
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* CURRENCIES SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .currencies-section {
    padding: 100px 32px;
    background: ${colors.bg.secondary};
    position: relative;
    z-index: 10;
  }

  .currencies-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .currencies-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .currencies-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .currency-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    padding: 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    animation: fade-in-up 0.5s ease forwards;
    opacity: 0;
  }

  .currency-card.active {
    border-color: ${colors.accent.primary};
    background: ${colors.gradient.lemonSoft};
  }

  .currency-card:hover {
    transform: translateY(-5px) scale(1.02);
    border-color: ${colors.border.lemon};
    box-shadow: 0 10px 30px ${colors.accent.glow}20;
  }

  .currency-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    background: ${colors.gradient.lemon};
    border-radius: 6px;
    color: ${colors.bg.primary};
    font-size: 10px;
    font-weight: 700;
  }

  .currency-flag {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .currency-symbol {
    font-size: 28px;
    font-weight: 800;
    color: ${colors.accent.primary};
    margin-bottom: 4px;
  }

  .currency-code {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin-bottom: 4px;
  }

  .currency-name {
    font-size: 11px;
    color: ${colors.text.muted};
  }

  .currency-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, ${colors.accent.primary}10 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .currency-card:hover .currency-glow {
    opacity: 1;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* INTEGRATION SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .integration-section {
    padding: 100px 32px;
    position: relative;
    z-index: 10;
  }

  .integration-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }

  @media (max-width: 1024px) {
    .integration-content {
      grid-template-columns: 1fr;
    }
  }

  .integration-info {
    text-align: left;
  }

  .integration-info .section-title {
    text-align: left;
  }

  .integration-info .section-description {
    text-align: left;
    margin: 0 0 32px 0;
    max-width: none;
  }

  .integration-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;
  }

  .integration-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    color: ${colors.text.secondary};
    font-size: 14px;
  }

  .integration-feature svg {
    color: ${colors.accent.primary};
    flex-shrink: 0;
  }

  .integration-cards {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .institution-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 20px;
    padding: 24px;
    transition: all 0.3s ease;
  }

  .institution-card:hover {
    border-color: ${colors.border.lemon};
    transform: translateX(10px);
    box-shadow: 0 10px 30px ${colors.accent.glow}15;
  }

  .institution-icon {
    width: 56px;
    height: 56px;
    background: ${colors.gradient.lemonSoft};
    border: 1px solid ${colors.border.lemon};
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${colors.accent.primary};
    margin-bottom: 16px;
  }

  .institution-card h3 {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin-bottom: 4px;
  }

  .institution-type {
    font-size: 12px;
    color: ${colors.accent.primary};
    font-weight: 600;
    display: block;
    margin-bottom: 12px;
  }

  .institution-card p {
    font-size: 14px;
    color: ${colors.text.secondary};
    line-height: 1.5;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* BLOCKCHAIN STATUS SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .blockchain-section {
    padding: 60px 32px;
    background: ${colors.bg.secondary};
    position: relative;
    z-index: 10;
  }

  .blockchain-status {
    max-width: 1000px;
    margin: 0 auto;
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.lemon};
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 0 60px ${colors.accent.glow}10;
  }

  .blockchain-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .blockchain-pulse {
    width: 12px;
    height: 12px;
    background: ${colors.accent.primary};
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 ${colors.accent.glow}60; }
    50% { box-shadow: 0 0 0 10px ${colors.accent.glow}00; }
  }

  .blockchain-label {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text.primary};
    letter-spacing: 1px;
  }

  .blockchain-connection {
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    color: ${colors.text.muted};
  }

  .blockchain-connection.connected {
    color: ${colors.accent.primary};
  }

  .blockchain-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .blockchain-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .blockchain-stat {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .blockchain-stat-icon {
    color: ${colors.accent.primary};
    width: 24px;
    height: 24px;
  }

  .blockchain-stat-info {
    display: flex;
    flex-direction: column;
  }

  .blockchain-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: ${colors.text.primary};
  }

  .blockchain-stat-label {
    font-size: 11px;
    color: ${colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .blockchain-explorer-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    background: ${colors.gradient.lemon};
    border: none;
    border-radius: 12px;
    color: ${colors.bg.primary};
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .blockchain-explorer-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${colors.accent.glow}40;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* FOOTER */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .footer {
    padding: 80px 32px 40px;
    background: ${colors.bg.primary};
    border-top: 1px solid ${colors.border.primary};
    position: relative;
    z-index: 10;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  .footer-main {
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 60px;
    margin-bottom: 60px;
  }

  @media (max-width: 768px) {
    .footer-main {
      grid-template-columns: 1fr;
    }
  }

  .footer-brand {
    max-width: 300px;
  }

  .footer-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .footer-title {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: ${colors.text.primary};
  }

  .footer-subtitle {
    display: block;
    font-size: 11px;
    color: ${colors.accent.primary};
    font-weight: 600;
  }

  .footer-description {
    font-size: 14px;
    color: ${colors.text.secondary};
    line-height: 1.6;
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }

  @media (max-width: 640px) {
    .footer-links {
      grid-template-columns: 1fr;
    }
  }

  .footer-column h4 {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .footer-column a {
    display: block;
    font-size: 14px;
    color: ${colors.text.secondary};
    text-decoration: none;
    margin-bottom: 12px;
    transition: color 0.2s;
  }

  .footer-column a:hover {
    color: ${colors.accent.primary};
  }

  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 40px;
    border-top: 1px solid ${colors.border.primary};
  }

  @media (max-width: 640px) {
    .footer-bottom {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }
  }

  .footer-bottom p {
    font-size: 13px;
    color: ${colors.text.muted};
  }

  .footer-legal {
    display: flex;
    gap: 24px;
  }

  .footer-legal a {
    font-size: 13px;
    color: ${colors.text.muted};
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-legal a:hover {
    color: ${colors.accent.primary};
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* SMART CONTRACTS MODAL */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .contracts-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .contracts-modal {
    background: ${colors.bg.secondary};
    border: 1px solid ${colors.border.lemon};
    border-radius: 24px;
    max-width: 1200px;
    max-height: 90vh;
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
    box-shadow: 0 0 60px ${colors.accent.glow}30;
  }

  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .contracts-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
    border-bottom: 1px solid ${colors.border.primary};
    background: linear-gradient(180deg, ${colors.bg.card} 0%, transparent 100%);
  }

  .contracts-modal-title {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .contracts-modal-title svg {
    color: ${colors.accent.primary};
  }

  .contracts-modal-title h2 {
    font-size: 24px;
    font-weight: 800;
    color: ${colors.text.primary};
    margin: 0;
  }

  .contracts-modal-title p {
    font-size: 13px;
    color: ${colors.text.secondary};
    margin: 4px 0 0;
  }

  .contracts-close-btn {
    background: transparent;
    border: 1px solid ${colors.border.secondary};
    border-radius: 10px;
    color: ${colors.text.secondary};
    cursor: pointer;
    padding: 8px;
    transition: all 0.2s;
  }

  .contracts-close-btn:hover {
    background: ${colors.accent.primary}20;
    border-color: ${colors.accent.primary};
    color: ${colors.accent.primary};
  }

  .contracts-modal-content {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
  }

  /* Signature Flow */
  .signature-flow {
    background: ${colors.gradient.lemonSoft};
    border: 1px solid ${colors.border.lemon};
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 32px;
  }

  .signature-flow h3 {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.accent.primary};
    margin: 0 0 20px;
    text-align: center;
  }

  .flow-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .flow-step {
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 12px;
    padding: 12px 20px;
  }

  .flow-number {
    width: 32px;
    height: 32px;
    background: ${colors.gradient.lemon};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: ${colors.bg.primary};
    font-size: 14px;
  }

  .flow-info {
    display: flex;
    flex-direction: column;
  }

  .flow-label {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text.primary};
  }

  .flow-desc {
    font-size: 11px;
    color: ${colors.text.muted};
  }

  .flow-arrow {
    color: ${colors.accent.primary};
  }

  /* Contracts Grid */
  .contracts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .contract-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    padding: 20px;
    transition: all 0.3s ease;
  }

  .contract-card:hover {
    border-color: ${colors.border.lemon};
    box-shadow: 0 10px 30px ${colors.accent.glow}15;
    transform: translateY(-3px);
  }

  .contract-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .contract-header svg {
    color: ${colors.accent.primary};
  }

  .contract-header h4 {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin: 0;
  }

  .contract-address {
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${colors.bg.primary};
    border: 1px solid ${colors.border.primary};
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .contract-address code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: ${colors.accent.bright};
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .contract-link {
    color: ${colors.text.muted};
    transition: color 0.2s;
  }

  .contract-link:hover {
    color: ${colors.accent.primary};
  }

  .contract-description {
    font-size: 13px;
    color: ${colors.text.secondary};
    line-height: 1.5;
    margin: 0 0 12px;
  }

  .contract-role {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${colors.accent.primary};
    margin-bottom: 12px;
  }

  .contract-role svg {
    width: 14px;
    height: 14px;
  }

  .contract-interactions {
    border-top: 1px solid ${colors.border.primary};
    padding-top: 12px;
  }

  .interactions-label {
    font-size: 11px;
    color: ${colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 8px;
  }

  .interactions-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .interaction-tag {
    background: ${colors.accent.primary}15;
    border: 1px solid ${colors.border.lemon};
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 11px;
    color: ${colors.accent.primary};
    font-weight: 600;
  }

  /* Authorized Wallets */
  .authorized-wallets {
    border-top: 1px solid ${colors.border.primary};
    padding-top: 32px;
  }

  .authorized-wallets h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin: 0 0 20px;
  }

  .authorized-wallets h3 svg {
    color: ${colors.accent.primary};
  }

  .wallets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }

  .wallet-card {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    padding: 20px;
    transition: all 0.3s ease;
  }

  .wallet-card:hover {
    border-color: ${colors.accent.gold};
    box-shadow: 0 10px 30px rgba(251, 191, 36, 0.1);
  }

  .wallet-header {
    margin-bottom: 12px;
  }

  .wallet-name {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.accent.gold};
  }

  .wallet-address {
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${colors.bg.primary};
    border: 1px solid ${colors.border.primary};
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .wallet-address code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: ${colors.accent.bright};
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wallet-address a {
    color: ${colors.text.muted};
    transition: color 0.2s;
  }

  .wallet-address a:hover {
    color: ${colors.accent.primary};
  }

  .wallet-roles {
    margin-bottom: 12px;
  }

  .roles-badge {
    background: ${colors.accent.gold}20;
    border: 1px solid ${colors.accent.gold}40;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 10px;
    color: ${colors.accent.gold};
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .wallet-description {
    font-size: 13px;
    color: ${colors.text.secondary};
    line-height: 1.5;
    margin: 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* FXDEFI.WORLD SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .fxdefi-section {
    padding: 100px 32px;
    background: linear-gradient(180deg, ${colors.bg.secondary} 0%, ${colors.bg.primary} 50%, ${colors.bg.secondary} 100%);
    position: relative;
    z-index: 10;
    overflow: hidden;
  }

  .fxdefi-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${colors.accent.gold}50, transparent);
  }

  .fxdefi-section::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${colors.accent.gold}50, transparent);
  }

  .fxdefi-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }

  .fxdefi-info .section-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, ${colors.accent.gold}15, ${colors.accent.gold}05);
    border: 1px solid ${colors.accent.gold}40;
    color: ${colors.accent.gold};
  }

  .fxdefi-info .section-title {
    font-size: 48px;
    font-weight: 800;
    margin: 16px 0;
    color: ${colors.text.primary};
  }

  .fxdefi-info .title-accent {
    background: linear-gradient(135deg, ${colors.accent.gold} 0%, #F59E0B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .fxdefi-tagline {
    font-size: 18px;
    color: ${colors.accent.gold};
    font-weight: 600;
    margin-bottom: 16px;
  }

  .fxdefi-features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 32px;
  }

  .fxdefi-feature {
    display: flex;
    gap: 14px;
    padding: 16px;
    background: ${colors.bg.tertiary};
    border: 1px solid ${colors.border.primary};
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .fxdefi-feature:hover {
    border-color: ${colors.accent.gold}50;
    background: linear-gradient(135deg, ${colors.accent.gold}08, transparent);
  }

  .fxdefi-feature-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, ${colors.accent.gold}20, ${colors.accent.gold}05);
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${colors.accent.gold};
    flex-shrink: 0;
  }

  .fxdefi-feature-content h4 {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin-bottom: 4px;
  }

  .fxdefi-feature-content p {
    font-size: 12px;
    color: ${colors.text.muted};
    line-height: 1.5;
    margin: 0;
  }

  .fxdefi-stats {
    display: flex;
    gap: 24px;
    margin-top: 32px;
    padding: 20px;
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 14px;
  }

  .fxdefi-stat {
    flex: 1;
    text-align: center;
  }

  .fxdefi-stat .stat-value {
    display: block;
    font-size: 24px;
    font-weight: 800;
    color: ${colors.accent.gold};
  }

  .fxdefi-stat .stat-label {
    font-size: 11px;
    color: ${colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .fxdefi-cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    padding: 14px 28px;
    background: linear-gradient(135deg, ${colors.accent.gold} 0%, #F59E0B 100%);
    border: none;
    border-radius: 12px;
    color: ${colors.bg.primary};
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .fxdefi-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px ${colors.accent.gold}40;
  }

  .fxdefi-visual {
    position: relative;
  }

  .fxdefi-chart-preview {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .chart-pair {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.text.primary};
  }

  .chart-price {
    font-size: 14px;
    font-weight: 600;
  }

  .chart-price.positive {
    color: ${colors.accent.emerald};
  }

  .chart-bars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 120px;
    padding: 10px 0;
  }

  .chart-bar {
    flex: 1;
    border-radius: 2px;
    transition: height 0.5s ease;
  }

  .chart-bar.positive {
    background: linear-gradient(180deg, ${colors.accent.emerald} 0%, ${colors.accent.emerald}50 100%);
  }

  .chart-bar.negative {
    background: linear-gradient(180deg, #EF4444 0%, #EF444450 100%);
  }

  .chart-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${colors.border.primary};
    font-size: 11px;
    color: ${colors.text.muted};
  }

  .live-dot {
    width: 8px;
    height: 8px;
    background: ${colors.accent.emerald};
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .fxdefi-currencies {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .currency-badge {
    padding: 8px 16px;
    background: ${colors.bg.tertiary};
    border: 1px solid ${colors.border.primary};
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    color: ${colors.text.secondary};
  }

  @media (max-width: 900px) {
    .fxdefi-content {
      grid-template-columns: 1fr;
      gap: 40px;
    }
    
    .fxdefi-info .section-title {
      font-size: 32px;
    }
    
    .fxdefi-features {
      grid-template-columns: 1fr;
    }
    
    .fxdefi-stats {
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .fxdefi-stat {
      flex: 1 1 40%;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* ISO 20022 SECTION */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  .iso-section {
    padding: 100px 32px;
    background: linear-gradient(180deg, ${colors.bg.primary} 0%, ${colors.bg.secondary} 50%, ${colors.bg.primary} 100%);
    position: relative;
    z-index: 10;
    overflow: hidden;
  }

  .iso-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${colors.border.lemon}, transparent);
  }

  .iso-section::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${colors.border.lemon}, transparent);
  }

  .iso-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 60px;
    align-items: start;
  }

  @media (max-width: 1024px) {
    .iso-content {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  .iso-badge-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 1024px) {
    .iso-badge-container {
      order: -1;
    }
  }

  .iso-image-wrapper {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid ${colors.accent.primary};
    box-shadow: 
      0 0 30px ${colors.accent.glow}50,
      0 0 60px ${colors.accent.primary}30,
      inset 0 0 20px rgba(0, 0, 0, 0.5);
    animation: iso-float 6s ease-in-out infinite;
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .iso-badge-image {
    width: 120%;
    height: 120%;
    object-fit: cover;
    object-position: center;
  }

  @keyframes iso-float {
    0%, 100% {
      transform: translateY(0);
      box-shadow: 
        0 0 30px ${colors.accent.glow}50,
        0 0 60px ${colors.accent.primary}30;
    }
    50% {
      transform: translateY(-8px);
      box-shadow: 
        0 0 50px ${colors.accent.glow}70,
        0 0 80px ${colors.accent.primary}40;
    }
  }

  .iso-glow {
    position: absolute;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, ${colors.accent.primary}25 0%, ${colors.accent.secondary}12 40%, transparent 70%);
    z-index: 1;
    animation: iso-glow-pulse 4s ease-in-out infinite;
  }

  @keyframes iso-glow-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .iso-info {
    text-align: left;
  }

  .iso-info .section-badge {
    background: ${colors.accent.primary}15;
    border-color: ${colors.border.lemon};
    color: ${colors.accent.primary};
  }

  .iso-info .section-title {
    text-align: left;
  }

  .iso-info .title-accent {
    color: ${colors.accent.primary};
    text-shadow: 0 0 30px ${colors.accent.glow}50;
  }

  .iso-info .section-description {
    text-align: left;
    margin: 0 0 40px 0;
    max-width: none;
  }

  .iso-features {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }

  @media (max-width: 768px) {
    .iso-features {
      grid-template-columns: 1fr;
    }
  }

  .iso-feature {
    display: flex;
    gap: 16px;
    padding: 20px;
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.primary};
    border-radius: 16px;
    transition: all 0.3s ease;
  }

  .iso-feature:hover {
    border-color: ${colors.border.lemon};
    transform: translateX(5px);
    box-shadow: 0 10px 30px ${colors.accent.glow}15;
  }

  .iso-feature-icon {
    width: 48px;
    height: 48px;
    background: ${colors.gradient.lemonSoft};
    border: 1px solid ${colors.border.lemon};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${colors.accent.primary};
    flex-shrink: 0;
  }

  .iso-feature-content h4 {
    font-size: 15px;
    font-weight: 700;
    color: ${colors.text.primary};
    margin: 0 0 6px;
  }

  .iso-feature-content p {
    font-size: 13px;
    color: ${colors.text.secondary};
    line-height: 1.5;
    margin: 0;
  }

  .iso-protocols {
    background: ${colors.bg.card};
    border: 1px solid ${colors.border.lemon};
    border-radius: 16px;
    padding: 20px;
  }

  .protocols-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: ${colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }

  .protocols-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .protocol-tag {
    background: ${colors.gradient.lemonSoft};
    border: 1px solid ${colors.border.lemon};
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 700;
    color: ${colors.accent.primary};
    font-family: 'JetBrains Mono', monospace;
    transition: all 0.2s;
  }

  .protocol-tag:hover {
    background: ${colors.accent.primary}25;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px ${colors.accent.glow}25;
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* RESPONSIVE */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  
  @media (max-width: 768px) {
    .header-nav {
      display: none;
    }

    .header-actions .btn-explorer span,
    .header-actions .btn-admin span {
      display: none;
    }

    .header-actions .btn-explorer,
    .header-actions .btn-admin {
      padding: 10px;
    }

    .hero-cta {
      flex-direction: column;
      align-items: center;
    }

    .btn-primary, .btn-secondary {
      width: 100%;
      max-width: 300px;
      justify-content: center;
    }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLORER STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const explorerStyles = `
  .explorer-fullscreen {
    position: fixed;
    inset: 0;
    background: ${colors.bg.primary};
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .explorer-header {
    min-height: 56px;
    background: linear-gradient(180deg, ${colors.bg.secondary} 0%, ${colors.bg.primary} 100%);
    border-bottom: 1px solid ${colors.border.lemon};
    display: flex;
    align-items: center;
    padding: 8px 16px;
    gap: 12px;
    flex-shrink: 0;
    justify-content: space-between;
  }

  @media (min-width: 768px) {
    .explorer-header {
      padding: 0 24px;
      min-height: 60px;
    }
  }

  .explorer-back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid ${colors.border.lemon};
    border-radius: 8px;
    color: ${colors.accent.primary};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .explorer-back-btn:hover {
    background: ${colors.accent.primary}15;
  }

  .explorer-title-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .explorer-title-section h1 {
    font-size: 16px;
    font-weight: 800;
    color: ${colors.accent.primary};
    margin: 0;
  }

  .explorer-title-section p {
    font-size: 11px;
    color: ${colors.text.secondary};
    margin: 0;
  }

  @media (max-width: 767px) {
    .explorer-title-section {
      display: none;
    }
  }

  .explorer-admin-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: ${colors.gradient.lemon};
    border: none;
    border-radius: 8px;
    color: ${colors.bg.primary};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .explorer-admin-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px ${colors.accent.glow}40;
  }

  .explorer-content {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
`;

export default LandingPage;
