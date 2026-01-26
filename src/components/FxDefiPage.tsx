// ═══════════════════════════════════════════════════════════════════════════════
// FXDEFI.WORLD - PROFESSIONAL TRADING PLATFORM v4.0 PREMIUM
// Professional Trading Interface with Full Features + Wallet Integration
// AI Auto-Trading with Live Profit Simulation
// 15 Tokenized Currencies + 15 Commodities
// Launch: 2026
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Activity, Globe, Shield, Zap, Database,
  Layers, Lock, Coins, Network, Wallet, Clock, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, ArrowLeft, ExternalLink, FileText, Sparkles, CheckCircle,
  Plus, Minus, Settings, Bell, Search, Menu, X, Eye, Star, BookOpen, Play,
  Bot, Brain, Cpu, Gem, Fuel, Wheat, Server, Radio, Maximize2, Grid,
  ArrowUp, ArrowDown, Circle, Crosshair, ZoomIn, ZoomOut, RotateCcw,
  MousePointer, Type, TrendingUp as TrendIcon, Hash, Percent, RefreshCw,
  LogOut, Copy, AlertCircle, Loader2, MessageSquare, Send, Sparkle, StopCircle,
  Award, Users, Volume2, VolumeX, DollarSign, Target, Flame, Mail, Twitter,
  MessageCircle, Github, ShieldCheck, Verified, Trophy, TrendingUp as TrendUp,
  Newspaper
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const useAnimatedCounter = (end: number, duration: number = 2000, suffix: string = '', prefix: string = '') => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);
  
  return { count: `${prefix}${count}${suffix}`, ref };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'profit';
  title: string;
  message: string;
  profit?: number;
}

const ToastContainer: React.FC<{ toasts: Toast[], onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
  <div className="toast-container">
    {toasts.map(toast => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        <div className="toast-icon">
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Bell size={18} />}
          {toast.type === 'profit' && <DollarSign size={18} />}
        </div>
        <div className="toast-content">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
          {toast.profit && <div className="toast-profit">+${toast.profit.toFixed(2)}</div>}
        </div>
        <button className="toast-close" onClick={() => onRemove(toast.id)} title="Close notification" aria-label="Close notification"><X size={14} /></button>
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TRADING PLATFORM COLOR SCHEME (LemonMinted Dark Theme)
// Premium black with lemon/lime accents - matching LemonMinted
// ═══════════════════════════════════════════════════════════════════════════════

const theme = {
  bg: {
    primary: '#0a0a0a',      // Deep black
    secondary: '#111111',    // Slightly lighter black
    tertiary: '#1a1a1a',     // Card backgrounds
    panel: '#0d0d0d',
    input: '#151515',
    hover: '#252525',
    card: '#0f0f0f'
  },
  border: {
    primary: '#1f1f1f',
    secondary: '#2a2a2a',
    accent: '#A3E635',       // Lemon accent
    lemon: '#A3E63530'       // Lemon with transparency
  },
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#666666',
    white: '#ffffff'
  },
  accent: {
    lemon: '#A3E635',        // Primary lemon
    lime: '#84cc16',         // Lime green
    green: '#22c55e',        // Success green
    red: '#ef4444',          // Error/sell red
    orange: '#f59e0b',
    purple: '#a855f7',
    cyan: '#06b6d4',
    blue: '#3b82f6'
  },
  chart: {
    up: '#22c55e',           // Green for bullish
    upLight: '#4ade80',
    down: '#ef4444',         // Red for bearish
    downLight: '#f87171',
    grid: '#1a1a1a',
    gridLight: '#222222',
    ma1: '#A3E635',          // Lemon MA
    ma2: '#f59e0b',          // Orange MA
    macd: '#3b82f6',
    signal: '#f59e0b',
    histogram: '#22c55e',
    volume: '#A3E63550'
  },
  gradient: {
    lemon: 'linear-gradient(135deg, #A3E635 0%, #84cc16 100%)',
    dark: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET DATA
// ═══════════════════════════════════════════════════════════════════════════════

const WATCHLIST = [
  { symbol: 'VUSD/VEUR', last: 0.91856, change: 0.00031, changePercent: 0.22, bid: 0.91854, ask: 0.91858 },
  { symbol: 'VCAD/VUSD', last: 0.80285, change: 0.00130, changePercent: 0.16, bid: 0.80283, ask: 0.80287 },
  { symbol: 'VEUR/VJPY', last: 130.603, change: 0.733, changePercent: 0.56, bid: 130.600, ask: 130.606 },
  { symbol: 'VUSD/VEUR', last: 1.15662, change: -0.00083, changePercent: -0.07, bid: 1.15659, ask: 1.15665, active: true },
  { symbol: 'VEUR/VGBP', last: 0.84868, change: -0.00136, changePercent: -0.16, bid: 0.84865, ask: 0.84871 },
  { symbol: 'VAU/VUSD', last: 2024.50, change: 12.30, changePercent: 0.61, bid: 2024.45, ask: 2024.55 },
  { symbol: 'VTI/VUSD', last: 78.45, change: -0.92, changePercent: -1.16, bid: 78.43, ask: 78.47 },
];

const CURRENCIES = [
  { code: 'USD', vCode: 'VUSD', name: 'US Dollar', flag: '🇺🇸', rate: 1.0000 },
  { code: 'EUR', vCode: 'VEUR', name: 'Euro', flag: '🇪🇺', rate: 0.9185 },
  { code: 'GBP', vCode: 'VGBP', name: 'British Pound', flag: '🇬🇧', rate: 0.7892 },
  { code: 'CHF', vCode: 'VCHF', name: 'Swiss Franc', flag: '🇨🇭', rate: 0.8912 },
  { code: 'JPY', vCode: 'VJPY', name: 'Japanese Yen', flag: '🇯🇵', rate: 156.42 },
  { code: 'CAD', vCode: 'VCAD', name: 'Canadian Dollar', flag: '🇨🇦', rate: 1.4385 },
  { code: 'AUD', vCode: 'VAUD', name: 'Australian Dollar', flag: '🇦🇺', rate: 1.5892 },
  { code: 'NZD', vCode: 'VNZD', name: 'New Zealand Dollar', flag: '🇳🇿', rate: 1.7234 },
  { code: 'SGD', vCode: 'VSGD', name: 'Singapore Dollar', flag: '🇸🇬', rate: 1.3521 },
  { code: 'HKD', vCode: 'VHKD', name: 'Hong Kong Dollar', flag: '🇭🇰', rate: 7.7845 },
  { code: 'CNY', vCode: 'VCNY', name: 'Chinese Yuan', flag: '🇨🇳', rate: 7.2456 },
  { code: 'AED', vCode: 'VAED', name: 'UAE Dirham', flag: '🇦🇪', rate: 3.6725 },
  { code: 'SAR', vCode: 'VSAR', name: 'Saudi Riyal', flag: '🇸🇦', rate: 3.7500 },
  { code: 'INR', vCode: 'VINR', name: 'Indian Rupee', flag: '🇮🇳', rate: 83.42 },
  { code: 'MXN', vCode: 'VMXN', name: 'Mexican Peso', flag: '🇲🇽', rate: 17.1892 }
];

// Custom SVG Icons for Commodities
const CommodityIcons: { [key: string]: React.FC<{ size?: number }> } = {
  // Gold - Golden bar/ingot
  VAU: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="50%" stopColor="#FFA500"/>
          <stop offset="100%" stopColor="#B8860B"/>
        </linearGradient>
      </defs>
      <path d="M4 18L6 8H18L20 18H4Z" fill="url(#goldGrad)" stroke="#B8860B" strokeWidth="1"/>
      <path d="M6 8L8 4H16L18 8H6Z" fill="#FFE55C" stroke="#DAA520" strokeWidth="0.5"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="#B8860B" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  ),
  // Silver - Silver bar
  VAG: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8E8E8"/>
          <stop offset="50%" stopColor="#C0C0C0"/>
          <stop offset="100%" stopColor="#808080"/>
        </linearGradient>
      </defs>
      <path d="M4 18L6 8H18L20 18H4Z" fill="url(#silverGrad)" stroke="#808080" strokeWidth="1"/>
      <path d="M6 8L8 4H16L18 8H6Z" fill="#D3D3D3" stroke="#A9A9A9" strokeWidth="0.5"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#696969" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  ),
  // Platinum - Shiny platinum coin
  VPT: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="platGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5E4E2"/>
          <stop offset="50%" stopColor="#A0A0A0"/>
          <stop offset="100%" stopColor="#696969"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#platGrad)" stroke="#696969" strokeWidth="1"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="#E5E4E2" strokeWidth="0.5"/>
      <text x="12" y="15" textAnchor="middle" fontSize="7" fill="#404040" fontWeight="bold">Pt</text>
    </svg>
  ),
  // Palladium - Metallic disc
  VPD: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="pallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CED0CE"/>
          <stop offset="50%" stopColor="#9A9A9A"/>
          <stop offset="100%" stopColor="#6E6E6E"/>
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="12" rx="9" ry="7" fill="url(#pallGrad)" stroke="#6E6E6E" strokeWidth="1"/>
      <ellipse cx="12" cy="11" rx="6" ry="4" fill="none" stroke="#CED0CE" strokeWidth="0.5"/>
      <text x="12" y="14" textAnchor="middle" fontSize="6" fill="#404040" fontWeight="bold">Pd</text>
    </svg>
  ),
  // Crude Oil WTI - Oil barrel
  VTI: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="oilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2C2C2C"/>
          <stop offset="100%" stopColor="#1a1a1a"/>
        </linearGradient>
      </defs>
      <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#oilGrad)" stroke="#404040" strokeWidth="1"/>
      <ellipse cx="12" cy="5" rx="6" ry="2" fill="#3a3a3a" stroke="#505050" strokeWidth="0.5"/>
      <rect x="7" y="8" width="10" height="2" fill="#505050" rx="0.5"/>
      <rect x="7" y="14" width="10" height="2" fill="#505050" rx="0.5"/>
      <text x="12" y="12" textAnchor="middle" fontSize="5" fill="#A3E635" fontWeight="bold">WTI</text>
    </svg>
  ),
  // Brent Crude - Dark oil drop
  VBR: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="brentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3D3D3D"/>
          <stop offset="100%" stopColor="#1C1C1C"/>
        </linearGradient>
      </defs>
      <path d="M12 3C12 3 6 10 6 14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14C18 10 12 3 12 3Z" fill="url(#brentGrad)" stroke="#505050" strokeWidth="1"/>
      <ellipse cx="10" cy="12" rx="2" ry="3" fill="#4a4a4a" opacity="0.5"/>
    </svg>
  ),
  // Natural Gas - Flame
  VNG: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gasGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#1E90FF"/>
          <stop offset="50%" stopColor="#00BFFF"/>
          <stop offset="100%" stopColor="#87CEEB"/>
        </linearGradient>
      </defs>
      <path d="M12 2C12 2 6 8 6 13C6 16 8 20 12 20C16 20 18 16 18 13C18 8 12 2 12 2Z" fill="url(#gasGrad)"/>
      <path d="M12 8C12 8 9 11 9 14C9 16 10 18 12 18C14 18 15 16 15 14C15 11 12 8 12 8Z" fill="#E0F7FF"/>
    </svg>
  ),
  // Coal - Black rock
  VCL: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="coalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D2D2D"/>
          <stop offset="100%" stopColor="#0D0D0D"/>
        </linearGradient>
      </defs>
      <path d="M4 14L6 8L10 6L14 7L18 6L20 10L19 16L14 18L8 17L4 14Z" fill="url(#coalGrad)" stroke="#404040" strokeWidth="0.5"/>
      <path d="M8 10L12 9L15 11" stroke="#505050" strokeWidth="0.5"/>
      <circle cx="10" cy="13" r="1" fill="#404040"/>
      <circle cx="15" cy="12" r="0.8" fill="#383838"/>
    </svg>
  ),
  // Wheat - Golden wheat stalk
  VWH: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 20V8" stroke="#8B7355" strokeWidth="1.5"/>
      <ellipse cx="12" cy="6" rx="2" ry="3" fill="#DAA520"/>
      <ellipse cx="9" cy="8" rx="1.5" ry="2.5" fill="#DAA520" transform="rotate(-20 9 8)"/>
      <ellipse cx="15" cy="8" rx="1.5" ry="2.5" fill="#DAA520" transform="rotate(20 15 8)"/>
      <ellipse cx="8" cy="11" rx="1.2" ry="2" fill="#DAA520" transform="rotate(-30 8 11)"/>
      <ellipse cx="16" cy="11" rx="1.2" ry="2" fill="#DAA520" transform="rotate(30 16 11)"/>
      <path d="M10 18L8 16M14 18L16 16" stroke="#8B7355" strokeWidth="1"/>
    </svg>
  ),
  // Corn - Corn cob
  VCN: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="cornGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor="#FFA500"/>
        </linearGradient>
      </defs>
      <path d="M8 20L10 14L9 6L12 4L15 6L14 14L16 20H8Z" fill="url(#cornGrad)" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M10 7L14 7M10 9L14 9M10 11L14 11M10 13L14 13" stroke="#8B7355" strokeWidth="0.5"/>
      <path d="M9 4C9 4 8 2 10 2L12 4L14 2C16 2 15 4 15 4" fill="#228B22" stroke="#228B22"/>
    </svg>
  ),
  // Soybeans - Green beans
  VSY: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="8" cy="10" rx="3" ry="4" fill="#90EE90" stroke="#228B22" strokeWidth="0.5" transform="rotate(-15 8 10)"/>
      <ellipse cx="14" cy="9" rx="3" ry="4" fill="#98FB98" stroke="#228B22" strokeWidth="0.5" transform="rotate(10 14 9)"/>
      <ellipse cx="11" cy="15" rx="3" ry="4" fill="#90EE90" stroke="#228B22" strokeWidth="0.5" transform="rotate(-5 11 15)"/>
      <circle cx="7" cy="9" r="1" fill="#ADFF2F"/>
      <circle cx="13" cy="8" r="1" fill="#ADFF2F"/>
      <circle cx="10" cy="14" r="1" fill="#ADFF2F"/>
    </svg>
  ),
  // Coffee - Coffee cup
  VCF: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 8H16V18C16 19.1046 15.1046 20 14 20H8C6.89543 20 6 19.1046 6 18V8Z" fill="#8B4513" stroke="#5D3A1A" strokeWidth="1"/>
      <path d="M6 8C6 6.89543 6.89543 6 8 6H14C15.1046 6 16 6.89543 16 8" stroke="#5D3A1A" strokeWidth="1"/>
      <path d="M16 10H18C19.1046 10 20 10.8954 20 12V14C20 15.1046 19.1046 16 18 16H16" stroke="#5D3A1A" strokeWidth="1" fill="none"/>
      <path d="M8 4C8 4 9 5 11 5C13 5 14 4 14 4" stroke="#A0522D" strokeWidth="1" fill="none"/>
      <ellipse cx="11" cy="12" rx="3" ry="1" fill="#D2691E" opacity="0.5"/>
    </svg>
  ),
  // Sugar - Sugar cubes
  VSU: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="7" height="7" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1" rx="1"/>
      <rect x="9" y="7" width="7" height="7" fill="#F8F8F8" stroke="#E0E0E0" strokeWidth="1" rx="1"/>
      <rect x="13" y="10" width="7" height="7" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1" rx="1"/>
      <rect x="7" y="14" width="7" height="6" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1" rx="1"/>
    </svg>
  ),
  // Cotton - Cotton boll
  VCT: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="4" fill="#FFFAFA" stroke="#E8E8E8" strokeWidth="0.5"/>
      <circle cx="8" cy="12" r="3" fill="#FFF5EE" stroke="#E8E8E8" strokeWidth="0.5"/>
      <circle cx="16" cy="12" r="3" fill="#FFFAF0" stroke="#E8E8E8" strokeWidth="0.5"/>
      <circle cx="10" cy="14" r="3" fill="#FFFAFA" stroke="#E8E8E8" strokeWidth="0.5"/>
      <circle cx="14" cy="14" r="3" fill="#FFF5EE" stroke="#E8E8E8" strokeWidth="0.5"/>
      <path d="M12 16V20M10 18L12 20L14 18" stroke="#228B22" strokeWidth="1"/>
    </svg>
  ),
  // Copper - Copper wire/pipe
  VCU: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B87333"/>
          <stop offset="50%" stopColor="#DA8A67"/>
          <stop offset="100%" stopColor="#8B4513"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="8" fill="none" stroke="url(#copperGrad)" strokeWidth="4"/>
      <circle cx="12" cy="12" r="4" fill="url(#copperGrad)"/>
      <path d="M12 4V2M12 22V20M4 12H2M22 12H20" stroke="#B87333" strokeWidth="1.5"/>
    </svg>
  ),
};

const COMMODITIES = [
  { vCode: 'VAU', name: 'Gold', price: 2024.50, change: 0.85, unit: 'oz', category: 'Precious Metals' },
  { vCode: 'VAG', name: 'Silver', price: 23.45, change: 1.23, unit: 'oz', category: 'Precious Metals' },
  { vCode: 'VPT', name: 'Platinum', price: 912.30, change: -0.45, unit: 'oz', category: 'Precious Metals' },
  { vCode: 'VPD', name: 'Palladium', price: 1045.80, change: 0.32, unit: 'oz', category: 'Precious Metals' },
  { vCode: 'VTI', name: 'Crude Oil WTI', price: 78.45, change: -1.25, unit: 'bbl', category: 'Energy' },
  { vCode: 'VBR', name: 'Brent Crude', price: 82.30, change: -0.98, unit: 'bbl', category: 'Energy' },
  { vCode: 'VNG', name: 'Natural Gas', price: 2.85, change: 2.15, unit: 'MMBtu', category: 'Energy' },
  { vCode: 'VCL', name: 'Coal', price: 125.60, change: 0.45, unit: 'ton', category: 'Energy' },
  { vCode: 'VWH', name: 'Wheat', price: 5.82, change: 1.85, unit: 'bu', category: 'Agriculture' },
  { vCode: 'VCN', name: 'Corn', price: 4.45, change: 0.65, unit: 'bu', category: 'Agriculture' },
  { vCode: 'VSY', name: 'Soybeans', price: 12.85, change: -0.35, unit: 'bu', category: 'Agriculture' },
  { vCode: 'VCF', name: 'Coffee', price: 1.92, change: 3.45, unit: 'lb', category: 'Agriculture' },
  { vCode: 'VSU', name: 'Sugar', price: 0.27, change: 1.12, unit: 'lb', category: 'Agriculture' },
  { vCode: 'VCT', name: 'Cotton', price: 0.82, change: -0.55, unit: 'lb', category: 'Agriculture' },
  { vCode: 'VCU', name: 'Copper', price: 3.85, change: 0.92, unit: 'lb', category: 'Industrial' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  en: {
    title: 'FxDefi', subtitle: 'Decentralized Forex & Commodities Protocol', launching: 'LAUNCHING 2026',
    heroTitle: 'The Future of Forex is', heroHighlight: 'Decentralized',
    heroDesc: 'Trade 15 tokenized fiat currencies and 15 commodities with institutional-grade execution on LemonChain.',
    currencyPairs: 'Currency Pairs', commoditiesLabel: 'Commodities', dailyVolume: 'Daily Volume',
    globalTrading: 'Global Trading', settlement: 'Settlement', avgSpread: 'Avg Spread',
    tradingTerminal: 'Professional Trading Terminal', tradingTerminalDesc: 'Advanced interface with real-time data',
    forexPairs: 'Tokenized Forex Currencies', forexPairsDesc: '15 major currencies backed 1:1 by certified reserves',
    commoditiesTitle: 'Tokenized Commodities', commoditiesDesc: 'Precious metals, energy, and agriculture - tradeable 24/7',
    features: 'Protocol Features', featuresDesc: 'Enterprise-grade DeFi infrastructure',
    roadmap: 'Launch Roadmap', roadmapDesc: 'Strategic rollout for 2026',
    joinWaitlist: 'Be First to Trade on FxDefi', waitlistDesc: 'Join waitlist for early access',
    launchApp: 'Launch App', readWhitepaper: 'Whitepaper', viewDocs: 'Docs',
    poweredBy: 'Powered by LemonMinted Protocol', backToTreasury: 'LemonMinted', verified: 'Verified',
    preciousMetals: 'Precious Metals', energy: 'Energy', agriculture: 'Agriculture', industrial: 'Industrial',
    deepLiquidity: 'Deep Liquidity', deepLiquidityDesc: '$2B+ TVL target across all pairs',
    oracleIntegration: 'Real-Time Pricing', oracleIntegrationDesc: 'Institutional-grade price feeds',
    instantSettlement: 'Instant Settlement', instantSettlementDesc: '3-second finality on LemonChain',
    globalAccess: '24/7 Global Access', globalAccessDesc: 'Trade anytime without restrictions',
    aiTrading: 'AI Trading Signals', aiTradingDesc: '78% historical accuracy',
    leverage: '100x Leverage', leverageDesc: 'With intelligent liquidation',
    q1: 'Q1 2026', q2: 'Q2 2026', q3: 'Q3 2026', q4: 'Q4 2026',
    testnet: 'Testnet Launch', mainnetAlpha: 'Mainnet Alpha', fullLaunch: 'Full Launch', expansion: 'Global Expansion'
  },
  es: {
    title: 'FxDefi', subtitle: 'Protocolo Descentralizado de Forex y Materias Primas', launching: 'LANZAMIENTO 2026',
    heroTitle: 'El Futuro del Forex es', heroHighlight: 'Descentralizado',
    heroDesc: 'Opera con 15 divisas tokenizadas y 15 materias primas con ejecución institucional en LemonChain.',
    currencyPairs: 'Pares de Divisas', commoditiesLabel: 'Materias Primas', dailyVolume: 'Volumen Diario',
    globalTrading: 'Trading Global', settlement: 'Liquidación', avgSpread: 'Spread Prom.',
    tradingTerminal: 'Terminal de Trading Profesional', tradingTerminalDesc: 'Interfaz avanzada con datos en tiempo real',
    forexPairs: 'Divisas Forex Tokenizadas', forexPairsDesc: '15 divisas principales respaldadas 1:1',
    commoditiesTitle: 'Materias Primas Tokenizadas', commoditiesDesc: 'Metales, energía y agricultura - operables 24/7',
    features: 'Características', featuresDesc: 'Infraestructura DeFi empresarial',
    roadmap: 'Hoja de Ruta', roadmapDesc: 'Lanzamiento estratégico 2026',
    joinWaitlist: 'Sé el Primero en FxDefi', waitlistDesc: 'Únete para acceso anticipado',
    launchApp: 'Iniciar App', readWhitepaper: 'Whitepaper', viewDocs: 'Docs',
    poweredBy: 'Impulsado por LemonMinted Protocol', backToTreasury: 'LemonMinted', verified: 'Verificado',
    preciousMetals: 'Metales Preciosos', energy: 'Energía', agriculture: 'Agricultura', industrial: 'Industrial',
    deepLiquidity: 'Liquidez Profunda', deepLiquidityDesc: 'Objetivo $2B+ TVL',
    oracleIntegration: 'Precios en Tiempo Real', oracleIntegrationDesc: 'Feeds de precios institucionales',
    instantSettlement: 'Liquidación Instantánea', instantSettlementDesc: '3 segundos en LemonChain',
    globalAccess: 'Acceso Global 24/7', globalAccessDesc: 'Opera sin restricciones',
    aiTrading: 'Señales IA', aiTradingDesc: '78% precisión histórica',
    leverage: '100x Apalancamiento', leverageDesc: 'Con liquidación inteligente',
    q1: 'Q1 2026', q2: 'Q2 2026', q3: 'Q3 2026', q4: 'Q4 2026',
    testnet: 'Lanzamiento Testnet', mainnetAlpha: 'Mainnet Alpha', fullLaunch: 'Lanzamiento Completo', expansion: 'Expansión Global'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// Import Whitepaper component
import FxDefiWhitepaper from './FxDefiWhitepaper';

// Subpage types
type SubpageType = 'main' | 'whitepaper' | 'documentation' | 'smart-contracts' | 'audit-reports' | 
                   'api-docs' | 'trading-guide' | 'faq' | 'blog' | 
                   'terms' | 'privacy' | 'risk-disclosure' | 'compliance';

const FxDefiPage: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const t = translations[language];
  
  // Subpage Navigation State
  const [activeSubpage, setActiveSubpage] = useState<SubpageType>('main');

  // Wallet State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Market Data State
  const [watchlist, setWatchlist] = useState(WATCHLIST);
  const [selectedSymbol, setSelectedSymbol] = useState(WATCHLIST[3]);
  const [commodityData, setCommodityData] = useState(COMMODITIES);
  const [orderAmount, setOrderAmount] = useState('1000');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  // Chart Data
  const [ohlcData, setOhlcData] = useState<Array<{o:number,h:number,l:number,c:number,v:number,time:string}>>([]);
  const [macdData, setMacdData] = useState<Array<{macd:number,signal:number,hist:number}>>([]);
  const [rsiData, setRsiData] = useState<number[]>([]);

  // DOM Ladder Data
  const [domLadder, setDomLadder] = useState<Array<{price:number,bid:number,ask:number}>>([]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  
  const addToast = useCallback((type: Toast['type'], title: string, message: string, profit?: number) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, title, message, profit }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // AI Auto-Trading State with Profit Simulation
  const [aiTotalProfit, setAiTotalProfit] = useState(0);
  const [aiTotalTrades, setAiTotalTrades] = useState(0);
  const [aiWinRate, setAiWinRate] = useState(78.5);
  const [aiActiveTrades, setAiActiveTrades] = useState<Array<{
    id: number;
    pair: string;
    direction: 'LONG' | 'SHORT';
    entry: number;
    current: number;
    size: number;
    profit: number;
    openTime: Date;
  }>>([]);
  const [aiClosedTrades, setAiClosedTrades] = useState<Array<{
    id: number;
    pair: string;
    direction: 'LONG' | 'SHORT';
    entry: number;
    exit: number;
    profit: number;
    pnl: number;
    closeTime: Date;
    result: 'WIN' | 'LOSS';
  }>>([]);
  const [aiDailyPnL, setAiDailyPnL] = useState(0);
  const aiTradeIdRef = useRef(100);

  // Market Sentiment State
  const [marketSentiment, setMarketSentiment] = useState(62); // 0-100, 50 = neutral
  const [fearGreedIndex, setFearGreedIndex] = useState(58);
  const [topMovers, setTopMovers] = useState<Array<{symbol: string, change: number, volume: string}>>([
    { symbol: 'VAU/VUSD', change: 2.45, volume: '$1.2B' },
    { symbol: 'VNG/VUSD', change: 1.89, volume: '$890M' },
    { symbol: 'VEUR/VJPY', change: -1.56, volume: '$2.1B' },
    { symbol: 'VTI/VUSD', change: -1.23, volume: '$1.5B' },
  ]);

  // Live Market Ticker Data
  const [tickerData, setTickerData] = useState([
    { symbol: 'VUSD/VEUR', price: 1.1566, change: 0.12 },
    { symbol: 'VAU/VUSD', price: 2024.50, change: 0.85 },
    { symbol: 'VTI/VUSD', price: 78.45, change: -1.16 },
    { symbol: 'VGBP/VUSD', price: 1.2685, change: 0.23 },
    { symbol: 'VJPY/VUSD', price: 0.0064, change: -0.45 },
    { symbol: 'VAG/VUSD', price: 23.45, change: 1.23 },
    { symbol: 'VNG/VUSD', price: 2.85, change: 2.15 },
    { symbol: 'VCHF/VUSD', price: 1.1225, change: 0.08 },
  ]);

  // Newsletter State
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Animation State
  const [isHeroVisible, setIsHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Animated Counters
  const pairsCounter = useAnimatedCounter(105, 2000, '+');
  const commoditiesCounter = useAnimatedCounter(15, 1500);
  const volumeCounter = useAnimatedCounter(6.6, 2500, 'T', '$');
  const tradingHoursCounter = useAnimatedCounter(24, 1000, '/7');
  const settlementCounter = useAnimatedCounter(3, 1500, 's');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string, timestamp: Date, type?: 'prediction' | 'signal' | 'info' | 'trade'}>>([
    { role: 'ai', content: language === 'es' ? '¡Bienvenido a FxDefi AI! Soy tu asistente de trading inteligente. Puedo darte predicciones de mercado, señales de trading y ejecutar operaciones automáticas con simulación de ganancias en tiempo real. ¿Qué deseas hacer hoy?' : 'Welcome to FxDefi AI! I\'m your intelligent trading assistant. I can provide market predictions, trading signals, and execute automatic trades with real-time profit simulation. What would you like to do today?', timestamp: new Date(), type: 'info' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(78);

  // AI Prediction Data
  const [aiPredictions, setAiPredictions] = useState<Array<{pair: string, direction: 'up' | 'down', confidence: number, target: number, timeframe: string}>>([
    { pair: 'VUSD/VEUR', direction: 'up', confidence: 82, target: 1.1620, timeframe: '4H' },
    { pair: 'VAU/VUSD', direction: 'up', confidence: 75, target: 2045.00, timeframe: '1D' },
    { pair: 'VTI/VUSD', direction: 'down', confidence: 68, target: 76.50, timeframe: '4H' },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL TERMINAL ENHANCEMENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Chart Enhancement States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(true);
  const [showStochastic, setShowStochastic] = useState(false);
  const [crosshairPosition, setCrosshairPosition] = useState<{x: number, y: number, price: number, time: string} | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');
  const chartRef = useRef<HTMLDivElement>(null);

  // Order Book State (Enhanced)
  const [orderBookDepth, setOrderBookDepth] = useState<Array<{price: number, bidSize: number, askSize: number, bidTotal: number, askTotal: number}>>([]);

  // Positions & Orders State
  const [openPositions, setOpenPositions] = useState<Array<{
    id: number;
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    leverage: number;
    liquidation: number;
    margin: number;
  }>>([
    { id: 1, symbol: 'VUSD/VEUR', side: 'LONG', size: 5000, entryPrice: 1.1540, currentPrice: 1.1566, pnl: 112.50, pnlPercent: 2.25, leverage: 10, liquidation: 1.0386, margin: 500 },
    { id: 2, symbol: 'VAU/VUSD', side: 'LONG', size: 2000, entryPrice: 2015.00, currentPrice: 2024.50, pnl: 47.15, pnlPercent: 0.47, leverage: 5, liquidation: 1612.00, margin: 400 },
  ]);

  const [pendingOrders, setPendingOrders] = useState<Array<{
    id: number;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'STOP' | 'STOP_LIMIT';
    price: number;
    size: number;
    filled: number;
    status: 'PENDING' | 'PARTIAL' | 'CANCELLED';
  }>>([
    { id: 101, symbol: 'VUSD/VEUR', side: 'BUY', type: 'LIMIT', price: 1.1520, size: 3000, filled: 0, status: 'PENDING' },
    { id: 102, symbol: 'VTI/VUSD', side: 'SELL', type: 'STOP', price: 76.00, size: 1500, filled: 0, status: 'PENDING' },
  ]);

  // Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<Array<{
    id: number;
    symbol: string;
    condition: 'above' | 'below';
    price: number;
    active: boolean;
    triggered: boolean;
  }>>([
    { id: 1, symbol: 'VAU/VUSD', condition: 'above', price: 2050.00, active: true, triggered: false },
    { id: 2, symbol: 'VTI/VUSD', condition: 'below', price: 75.00, active: true, triggered: false },
  ]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below'>('above');

  // Market News State
  const [marketNews, setMarketNews] = useState<Array<{
    id: number;
    title: string;
    source: string;
    time: string;
    impact: 'high' | 'medium' | 'low';
    symbol?: string;
  }>>([
    { id: 1, title: 'Fed signals potential rate pause in Q2', source: 'Reuters', time: '2m ago', impact: 'high', symbol: 'VUSD' },
    { id: 2, title: 'Gold reaches 3-month high on inflation fears', source: 'Bloomberg', time: '15m ago', impact: 'high', symbol: 'VAU' },
    { id: 3, title: 'ECB maintains hawkish stance', source: 'FT', time: '32m ago', impact: 'medium', symbol: 'VEUR' },
    { id: 4, title: 'Oil inventory data shows unexpected draw', source: 'CNBC', time: '1h ago', impact: 'medium', symbol: 'VTI' },
    { id: 5, title: 'LemonChain TVL surpasses $500M milestone', source: 'CoinDesk', time: '2h ago', impact: 'low' },
  ]);

  // Stochastic Data
  const [stochasticData, setStochasticData] = useState<Array<{k: number, d: number}>>([]);

  // Bollinger Bands Data
  const [bollingerData, setBollingerData] = useState<Array<{upper: number, middle: number, lower: number}>>([]);

  // Mini Chart Data for Watchlist Hover
  const [hoveredWatchlistItem, setHoveredWatchlistItem] = useState<string | null>(null);
  const [miniChartData, setMiniChartData] = useState<Array<number>>([]);

  // Active Tab in Bottom Panel
  const [activeBottomTab, setActiveBottomTab] = useState<'positions' | 'orders' | 'alerts' | 'news'>('positions');

  // Generate Bollinger Bands and Stochastic
  useEffect(() => {
    if (ohlcData.length < 20) return;
    
    // Calculate Bollinger Bands (20 period, 2 std dev)
    const bb: Array<{upper: number, middle: number, lower: number}> = [];
    for (let i = 19; i < ohlcData.length; i++) {
      const slice = ohlcData.slice(i - 19, i + 1);
      const closes = slice.map(c => c.c);
      const sma = closes.reduce((a, b) => a + b, 0) / 20;
      const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bb.push({
        upper: sma + 2 * stdDev,
        middle: sma,
        lower: sma - 2 * stdDev
      });
    }
    setBollingerData(bb);
    
    // Calculate Stochastic (14, 3, 3)
    const stoch: Array<{k: number, d: number}> = [];
    for (let i = 13; i < ohlcData.length; i++) {
      const slice = ohlcData.slice(i - 13, i + 1);
      const highest = Math.max(...slice.map(c => c.h));
      const lowest = Math.min(...slice.map(c => c.l));
      const current = ohlcData[i].c;
      const k = ((current - lowest) / (highest - lowest)) * 100;
      stoch.push({ k, d: k }); // Simplified - in reality D is SMA of K
    }
    // Calculate %D (3 period SMA of %K)
    for (let i = 2; i < stoch.length; i++) {
      stoch[i].d = (stoch[i].k + stoch[i-1].k + stoch[i-2].k) / 3;
    }
    setStochasticData(stoch);
  }, [ohlcData]);

  // Generate Order Book Depth
  useEffect(() => {
    const depth: Array<{price: number, bidSize: number, askSize: number, bidTotal: number, askTotal: number}> = [];
    const basePrice = selectedSymbol.last;
    const tickSize = basePrice > 100 ? 0.5 : 0.0001;
    let bidTotal = 0;
    let askTotal = 0;
    
    for (let i = -15; i <= 15; i++) {
      const price = basePrice + (i * tickSize);
      const distance = Math.abs(i);
      const sizeMultiplier = Math.max(0.1, 1 - distance * 0.05);
      
      const bidSize = i < 0 ? Math.floor((Math.random() * 50000 + 10000) * sizeMultiplier) : 0;
      const askSize = i > 0 ? Math.floor((Math.random() * 50000 + 10000) * sizeMultiplier) : 0;
      
      if (i < 0) bidTotal += bidSize;
      if (i > 0) askTotal += askSize;
      
      depth.push({ price, bidSize, askSize, bidTotal: i < 0 ? bidTotal : 0, askTotal: i > 0 ? askTotal : 0 });
    }
    setOrderBookDepth(depth);
  }, [selectedSymbol]);

  // Update positions P&L in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setOpenPositions(prev => prev.map(pos => {
        const priceChange = (Math.random() - 0.48) * 0.0005 * pos.currentPrice;
        const newPrice = pos.currentPrice + priceChange;
        const priceDiff = newPrice - pos.entryPrice;
        const multiplier = pos.side === 'LONG' ? 1 : -1;
        const newPnl = (priceDiff / pos.entryPrice) * pos.size * pos.leverage * multiplier;
        const newPnlPercent = (newPnl / pos.margin) * 100;
        
        return {
          ...pos,
          currentPrice: newPrice,
          pnl: newPnl,
          pnlPercent: newPnlPercent
        };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Check Price Alerts
  useEffect(() => {
    setPriceAlerts(prev => prev.map(alert => {
      if (!alert.active || alert.triggered) return alert;
      
      const currentPrice = watchlist.find(w => w.symbol.includes(alert.symbol))?.last || selectedSymbol.last;
      const triggered = alert.condition === 'above' 
        ? currentPrice >= alert.price 
        : currentPrice <= alert.price;
      
      if (triggered) {
        addToast('info', `🔔 ${language === 'es' ? 'Alerta de Precio' : 'Price Alert'}`, 
          `${alert.symbol} ${alert.condition === 'above' ? '↑' : '↓'} ${alert.price}`);
      }
      
      return { ...alert, triggered };
    }));
  }, [watchlist, selectedSymbol, language, addToast]);

  // Generate mini chart data on hover
  useEffect(() => {
    if (hoveredWatchlistItem) {
      const data = Array.from({length: 20}, () => Math.random() * 20 + 40);
      // Add trend
      const trend = Math.random() > 0.5 ? 1 : -1;
      for (let i = 1; i < data.length; i++) {
        data[i] = data[i - 1] + (Math.random() - 0.5 + trend * 0.1) * 3;
      }
      setMiniChartData(data);
    }
  }, [hoveredWatchlistItem]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key.toLowerCase()) {
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullscreen(prev => !prev);
          }
          break;
        case 'b':
          if (e.altKey) {
            e.preventDefault();
            setShowBollingerBands(prev => !prev);
          }
          break;
        case 's':
          if (e.altKey) {
            e.preventDefault();
            setShowStochastic(prev => !prev);
          }
          break;
        case 'escape':
          setIsFullscreen(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hero animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // AI Auto-Trading Engine - Simulates opening and closing profitable trades
  useEffect(() => {
    if (!autoTradingEnabled) return;
    
    // Open new trades periodically
    const openTradeInterval = setInterval(() => {
      if (aiActiveTrades.length < 5) { // Max 5 concurrent trades
        const pairs = ['VUSD/VEUR', 'VAU/VUSD', 'VTI/VUSD', 'VGBP/VUSD', 'VEUR/VJPY'];
        const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
        const direction = Math.random() > 0.4 ? 'LONG' : 'SHORT';
        const basePrice = randomPair.includes('VAU') ? 2024 : randomPair.includes('VTI') ? 78 : 1.15;
        const entry = basePrice * (1 + (Math.random() - 0.5) * 0.002);
        const size = Math.floor(Math.random() * 5000) + 1000;
        
        const newTrade = {
          id: ++aiTradeIdRef.current,
          pair: randomPair,
          direction,
          entry,
          current: entry,
          size,
          profit: 0,
          openTime: new Date()
        };
        
        setAiActiveTrades(prev => [...prev, newTrade]);
        
        const msg = language === 'es' 
          ? `🤖 **Trade Abierto**\n${direction} ${randomPair}\nEntrada: ${entry.toFixed(5)}\nTamaño: $${size.toLocaleString()}`
          : `🤖 **Trade Opened**\n${direction} ${randomPair}\nEntry: ${entry.toFixed(5)}\nSize: $${size.toLocaleString()}`;
        
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: msg, 
          timestamp: new Date(), 
          type: 'trade' 
        }]);
        
        addToast('info', language === 'es' ? 'Trade Abierto' : 'Trade Opened', `${direction} ${randomPair}`);
      }
    }, 8000 + Math.random() * 7000); // Open trade every 8-15 seconds
    
    // Update active trades and close with profit
    const updateTradeInterval = setInterval(() => {
      setAiActiveTrades(prev => {
        const updated = prev.map(trade => {
          // Simulate price movement with bullish bias for AI trades
          const movePercent = (Math.random() - 0.35) * 0.003; // Slight bullish bias
          const newCurrent = trade.current * (1 + movePercent);
          const priceDiff = newCurrent - trade.entry;
          const profitMultiplier = trade.direction === 'LONG' ? 1 : -1;
          const newProfit = priceDiff * profitMultiplier * trade.size / trade.entry * 100;
          
          return { ...trade, current: newCurrent, profit: newProfit };
        });
        
        // Check if any trade should be closed (take profit or after some time)
        const now = new Date();
        updated.forEach(trade => {
          const tradeAge = (now.getTime() - trade.openTime.getTime()) / 1000;
          const shouldClose = (trade.profit > 15 && tradeAge > 10) || // Take profit
                             (tradeAge > 25 && Math.random() > 0.7) || // Time-based close
                             (trade.profit > 50); // Big win - close immediately
          
          if (shouldClose) {
            const isWin = trade.profit > 0 || Math.random() > 0.25; // 75% win rate minimum
            const finalProfit = isWin ? Math.abs(trade.profit) + Math.random() * 20 : -Math.abs(trade.profit) * 0.3;
            
            const closedTrade = {
              id: trade.id,
              pair: trade.pair,
              direction: trade.direction,
              entry: trade.entry,
              exit: trade.current,
              profit: finalProfit,
              pnl: finalProfit,
              closeTime: now,
              result: isWin ? 'WIN' as const : 'LOSS' as const
            };
            
            setAiClosedTrades(prevClosed => [closedTrade, ...prevClosed.slice(0, 19)]);
            setAiTotalTrades(prev => prev + 1);
            setAiTotalProfit(prev => prev + finalProfit);
            setAiDailyPnL(prev => prev + finalProfit);
            
            if (isWin) {
              setAiWinRate(prev => Math.min(95, prev + 0.1));
            }
            
            const msg = language === 'es'
              ? `✅ **Trade Cerrado - ${isWin ? 'GANANCIA' : 'PÉRDIDA'}**\n${trade.direction} ${trade.pair}\nP&L: ${isWin ? '+' : ''}$${finalProfit.toFixed(2)}\nTotal Hoy: $${(aiDailyPnL + finalProfit).toFixed(2)}`
              : `✅ **Trade Closed - ${isWin ? 'PROFIT' : 'LOSS'}**\n${trade.direction} ${trade.pair}\nP&L: ${isWin ? '+' : ''}$${finalProfit.toFixed(2)}\nToday's Total: $${(aiDailyPnL + finalProfit).toFixed(2)}`;
            
            setChatMessages(prev => [...prev, { 
              role: 'ai', 
              content: msg, 
              timestamp: now, 
              type: 'trade' 
            }]);
            
            if (isWin) {
              addToast('profit', language === 'es' ? '💰 Ganancia!' : '💰 Profit!', `${trade.pair} closed`, finalProfit);
            }
            
            setAiActiveTrades(prevActive => prevActive.filter(t => t.id !== trade.id));
          }
        });
        
        return updated;
      });
    }, 2000);
    
    return () => {
      clearInterval(openTradeInterval);
      clearInterval(updateTradeInterval);
    };
  }, [autoTradingEnabled, language, aiDailyPnL, addToast]);

  // Live Ticker Animation
  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTickerData(prev => prev.map(item => ({
        ...item,
        price: item.price * (1 + (Math.random() - 0.5) * 0.0003),
        change: item.change + (Math.random() - 0.5) * 0.05
      })));
    }, 3000);
    return () => clearInterval(tickerInterval);
  }, []);

  // Market Sentiment Updates
  useEffect(() => {
    const sentimentInterval = setInterval(() => {
      setMarketSentiment(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 3)));
      setFearGreedIndex(prev => Math.max(15, Math.min(85, prev + (Math.random() - 0.5) * 2)));
    }, 5000);
    return () => clearInterval(sentimentInterval);
  }, []);

  // AI Chat Functions
  const generateAiResponse = (userMessage: string): { content: string, type: 'prediction' | 'signal' | 'info' | 'trade' } => {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes('predic') || msg.includes('forecast') || msg.includes('pronóstico')) {
      const predictions = [
        { content: `📊 **${selectedSymbol.symbol} Analysis**\n\nBased on technical indicators and AI pattern recognition:\n\n• **RSI**: ${(30 + Math.random() * 40).toFixed(1)} (Neutral)\n• **MACD**: ${Math.random() > 0.5 ? 'Bullish' : 'Bearish'} crossover forming\n• **Support**: ${formatPrice(selectedSymbol.last * 0.995)}\n• **Resistance**: ${formatPrice(selectedSymbol.last * 1.005)}\n\n**AI Prediction**: ${Math.random() > 0.5 ? '🟢 BULLISH' : '🔴 BEARISH'} (${(65 + Math.random() * 25).toFixed(0)}% confidence)\n**Target**: ${formatPrice(selectedSymbol.last * (1 + (Math.random() - 0.5) * 0.02))}`, type: 'prediction' as const },
        { content: `🎯 **Market Prediction for Next 4 Hours**\n\n${selectedSymbol.symbol}:\n• Direction: ${Math.random() > 0.5 ? '📈 UP' : '📉 DOWN'}\n• Entry: ${formatPrice(selectedSymbol.last)}\n• Target: ${formatPrice(selectedSymbol.last * (1 + (Math.random() - 0.4) * 0.015))}\n• Stop Loss: ${formatPrice(selectedSymbol.last * (1 - (Math.random() * 0.01)))}\n• Confidence: ${(70 + Math.random() * 20).toFixed(0)}%`, type: 'prediction' as const }
      ];
      return predictions[Math.floor(Math.random() * predictions.length)];
    }
    
    if (msg.includes('signal') || msg.includes('señal') || msg.includes('trade') || msg.includes('operar')) {
      const signals = [
        { content: `🚨 **TRADING SIGNAL**\n\n**Pair**: ${selectedSymbol.symbol}\n**Action**: ${Math.random() > 0.5 ? '🟢 BUY' : '🔴 SELL'}\n**Entry**: ${formatPrice(selectedSymbol.last)}\n**Take Profit**: ${formatPrice(selectedSymbol.last * 1.008)}\n**Stop Loss**: ${formatPrice(selectedSymbol.last * 0.995)}\n**Risk/Reward**: 1:1.6\n\n⚡ Signal Strength: ${(75 + Math.random() * 20).toFixed(0)}%`, type: 'signal' as const },
        { content: `📡 **AI SIGNAL DETECTED**\n\nPattern: ${['Double Bottom', 'Head & Shoulders', 'Bullish Engulfing', 'Bearish Divergence'][Math.floor(Math.random() * 4)]}\n\n**Recommended Action**: ${Math.random() > 0.5 ? 'LONG' : 'SHORT'} ${selectedSymbol.symbol}\n**Timeframe**: ${['15M', '1H', '4H'][Math.floor(Math.random() * 3)]}\n**Probability**: ${(68 + Math.random() * 25).toFixed(0)}%`, type: 'signal' as const }
      ];
      return signals[Math.floor(Math.random() * signals.length)];
    }
    
    if (msg.includes('auto') || msg.includes('bot') || msg.includes('automático')) {
      if (autoTradingEnabled) {
        return { content: `🤖 **Auto-Trading Status: ACTIVE**\n\n• Running Strategies: 3\n• Today's Trades: ${Math.floor(Math.random() * 15) + 5}\n• Win Rate: ${(65 + Math.random() * 20).toFixed(1)}%\n• P&L Today: ${Math.random() > 0.4 ? '+' : '-'}$${(Math.random() * 500).toFixed(2)}\n\nType "stop auto" to disable auto-trading.`, type: 'trade' as const };
      } else {
        return { content: `🤖 **Auto-Trading is currently DISABLED**\n\nTo enable AI auto-trading:\n1. Connect your wallet\n2. Set your risk parameters\n3. Type "enable auto trading"\n\n⚠️ Auto-trading uses AI signals with ${aiConfidence}% historical accuracy.`, type: 'info' as const };
      }
    }
    
    if (msg.includes('enable auto') || msg.includes('activar auto')) {
      setAutoTradingEnabled(true);
      return { content: `✅ **Auto-Trading ENABLED**\n\n🤖 AI Bot is now active!\n\n• Strategy: Conservative Scalping\n• Max Risk per Trade: 2%\n• Pairs Monitored: ${WATCHLIST.length}\n• AI Confidence Threshold: 70%\n\n📊 Monitoring markets for high-probability setups...`, type: 'trade' as const };
    }
    
    if (msg.includes('stop auto') || msg.includes('detener')) {
      setAutoTradingEnabled(false);
      return { content: `⏹️ **Auto-Trading DISABLED**\n\nYour AI trading bot has been stopped. All pending orders have been cancelled.\n\nSession Summary:\n• Total Trades: ${Math.floor(Math.random() * 20) + 5}\n• Win Rate: ${(60 + Math.random() * 25).toFixed(1)}%\n• Net P&L: ${Math.random() > 0.5 ? '+' : '-'}$${(Math.random() * 300).toFixed(2)}`, type: 'trade' as const };
    }
    
    if (msg.includes('gold') || msg.includes('oro') || msg.includes('vau')) {
      return { content: `🥇 **Gold (VAU/VUSD) Analysis**\n\n• Current Price: $${commodityData.find(c => c.vCode === 'VAU')?.price.toFixed(2)}\n• 24h Change: ${commodityData.find(c => c.vCode === 'VAU')?.change.toFixed(2)}%\n• AI Sentiment: ${Math.random() > 0.5 ? '🟢 Bullish' : '🟡 Neutral'}\n\n**Key Levels:**\n• Support: $2,010\n• Resistance: $2,050\n\n💡 Gold typically performs well during market uncertainty.`, type: 'prediction' as const };
    }
    
    // Default responses
    const defaults = [
      { content: `I can help you with:\n\n• **Predictions** - Type "prediction" for AI market analysis\n• **Signals** - Type "signal" for trading signals\n• **Auto-Trading** - Type "auto" to check bot status\n• **Specific Assets** - Ask about any currency or commodity\n\nWhat would you like to know?`, type: 'info' as const },
      { content: `🧠 **FxDefi AI Assistant**\n\nI'm analyzing ${WATCHLIST.length} currency pairs and ${COMMODITIES.length} commodities in real-time.\n\nCurrent Market Overview:\n• Trend: ${Math.random() > 0.5 ? '📈 Bullish' : '📉 Bearish'}\n• Volatility: ${['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]}\n• Best Opportunity: ${WATCHLIST[Math.floor(Math.random() * WATCHLIST.length)].symbol}\n\nAsk me for predictions or signals!`, type: 'info' as const }
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: 'user' as const, content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiTyping(true);
    
    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    const response = generateAiResponse(chatInput);
    setChatMessages(prev => [...prev, { role: 'ai', ...response, timestamp: new Date() }]);
    setIsAiTyping(false);
  };

  // Wallet Connection Functions
  const connectWallet = async () => {
    setIsConnecting(true);
    // Simulate wallet connection - in production this would use Web3/ethers.js
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a simulated address
    const addr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setWalletAddress(addr);
    setWalletBalance((Math.random() * 10000 + 1000).toFixed(2));
    setWalletConnected(true);
    setIsConnecting(false);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletBalance('0.00');
    setShowWalletDropdown(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Generate initial data with realistic OHLC patterns
  useEffect(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ohlc = [];
    const macd = [];
    const rsi = [];
    let price = selectedSymbol.last;
    let trend = Math.random() > 0.5 ? 1 : -1;
    let trendStrength = 0.6 + Math.random() * 0.4;
    
    // Generate 60 candles for better visualization
    for (let i = 0; i < 60; i++) {
      // Change trend occasionally
      if (Math.random() < 0.1) {
        trend *= -1;
        trendStrength = 0.5 + Math.random() * 0.5;
      }
      
      // Create realistic candle patterns
      const volatility = price > 100 ? price * 0.008 : price * 0.003;
      const trendMove = trend * volatility * trendStrength * (0.3 + Math.random() * 0.7);
      const noise = (Math.random() - 0.5) * volatility * 0.5;
      
      const o = price;
      const c = price + trendMove + noise;
      
      // Wicks - make them proportional to body
      const bodySize = Math.abs(c - o);
      const upperWick = Math.random() * bodySize * 1.5;
      const lowerWick = Math.random() * bodySize * 1.5;
      
      const h = Math.max(o, c) + upperWick;
      const l = Math.min(o, c) - lowerWick;
      
      // Volume with some correlation to price movement
      const v = 20 + Math.random() * 60 + Math.abs(c - o) / volatility * 20;
      
      // Generate time label
      const monthIdx = Math.floor(i / 5) % 12;
      const time = i % 5 === 0 ? months[monthIdx] : '';
      
      ohlc.push({ o, h, l, c, v, time });
      
      // MACD with momentum
      const macdVal = (c - o) / price * 100;
      macd.push({
        macd: macdVal * 0.8 + (Math.random() - 0.5) * 0.002,
        signal: macdVal * 0.6 + (Math.random() - 0.5) * 0.002,
        hist: macdVal * 0.2 + (Math.random() - 0.5) * 0.001
      });
      
      // RSI based on trend
      const rsiBase = 50 + trend * 15 * trendStrength;
      rsi.push(Math.max(15, Math.min(85, rsiBase + (Math.random() - 0.5) * 20)));
      
      price = c;
    }
    
    setOhlcData(ohlc);
    setMacdData(macd);
    setRsiData(rsi);

    // Generate DOM Ladder with realistic depth
    const ladder = [];
    const basePrice = selectedSymbol.last;
    const tickSize = basePrice > 100 ? 0.01 : 0.00005;
    
    for (let i = 15; i >= -15; i--) {
      const p = basePrice + (i * tickSize);
      // More volume near the current price
      const distanceFromCenter = Math.abs(i);
      const volumeMultiplier = Math.max(0.2, 1 - distanceFromCenter * 0.05);
      
      ladder.push({
        price: p,
        bid: i <= 0 ? Math.floor(Math.random() * 800 * volumeMultiplier) + 50 : 0,
        ask: i >= 0 ? Math.floor(Math.random() * 800 * volumeMultiplier) + 50 : 0
      });
    }
    setDomLadder(ladder);
  }, [selectedSymbol]);

  // Real-time price updates (every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlist(prev => prev.map(item => {
        const volatility = item.last > 100 ? 0.0001 : 0.000005;
        const change = (Math.random() - 0.5) * volatility * item.last;
        const newLast = item.last + change;
        return {
          ...item,
          last: newLast,
          bid: newLast - (item.last > 100 ? 0.002 : 0.00002),
          ask: newLast + (item.last > 100 ? 0.002 : 0.00002),
          change: item.change + change,
          changePercent: item.changePercent + (change / item.last) * 100
        };
      }));

      setCommodityData(prev => prev.map(item => ({
        ...item,
        price: item.price * (1 + (Math.random() - 0.5) * 0.0002),
        change: item.change + (Math.random() - 0.5) * 0.02
      })));

      // Update last candle
      setOhlcData(prev => {
        if (prev.length === 0) return prev;
        const newData = [...prev];
        const last = { ...newData[newData.length - 1] };
        const change = (Math.random() - 0.5) * 0.0003 * selectedSymbol.last;
        last.c = last.c + change;
        last.h = Math.max(last.h, last.c);
        last.l = Math.min(last.l, last.c);
        newData[newData.length - 1] = last;
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Update selected symbol from watchlist
  useEffect(() => {
    const updated = watchlist.find(w => w.symbol === selectedSymbol.symbol);
    if (updated) setSelectedSymbol(updated);
  }, [watchlist]);

  // Format functions
  const formatPrice = (price: number) => price > 100 ? price.toFixed(3) : price.toFixed(5);
  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(5)} (${sign}${percent.toFixed(2)}%)`;
  };

  // Group commodities
  const commoditiesByCategory = useMemo(() => ({
    'Precious Metals': commodityData.filter(c => c.category === 'Precious Metals'),
    'Energy': commodityData.filter(c => c.category === 'Energy'),
    'Agriculture': commodityData.filter(c => c.category === 'Agriculture'),
    'Industrial': commodityData.filter(c => c.category === 'Industrial'),
  }), [commodityData]);

  // Render Subpage Component
  const renderSubpage = () => {
    const SubpageWrapper: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
      <div className="subpage-container">
        <div className="subpage-header">
          <button className="back-to-main-btn" onClick={() => setActiveSubpage('main')}>
            <ArrowLeft size={18} />
            <span>{language === 'es' ? 'Volver a FxDefi' : 'Back to FxDefi'}</span>
          </button>
          <h1 className="subpage-title">{title}</h1>
        </div>
        <div className="subpage-content">{children}</div>
        <footer className="subpage-footer">
          <span>© 2026 FxDefi.world - Powered by LemonChain</span>
          <button onClick={() => setActiveSubpage('main')} className="footer-back-btn">
            {language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
          </button>
        </footer>
      </div>
    );

    switch (activeSubpage) {
      case 'whitepaper':
        return <FxDefiWhitepaper language={language} onBack={() => setActiveSubpage('main')} />;
      
      case 'documentation':
        return (
          <SubpageWrapper title={language === 'es' ? 'Documentación' : 'Documentation'}>
            <div className="docs-grid">
              <div className="doc-section">
                <h2><BookOpen size={24} /> {language === 'es' ? 'Guía de Inicio Rápido' : 'Quick Start Guide'}</h2>
                <p>{language === 'es' ? 'Aprende los conceptos básicos de FxDefi.world en minutos.' : 'Learn the basics of FxDefi.world in minutes.'}</p>
                <div className="doc-card">
                  <h3>1. {language === 'es' ? 'Conectar Wallet' : 'Connect Wallet'}</h3>
                  <p>{language === 'es' ? 'Conecta tu wallet de LemonChain para acceder a todas las funciones de trading.' : 'Connect your LemonChain wallet to access all trading features.'}</p>
                </div>
                <div className="doc-card">
                  <h3>2. {language === 'es' ? 'Depositar Fondos' : 'Deposit Funds'}</h3>
                  <p>{language === 'es' ? 'Deposita VUSD u otras stablecoins tokenizadas para empezar a operar.' : 'Deposit VUSD or other tokenized stablecoins to start trading.'}</p>
                </div>
                <div className="doc-card">
                  <h3>3. {language === 'es' ? 'Ejecutar Operaciones' : 'Execute Trades'}</h3>
                  <p>{language === 'es' ? 'Usa nuestra interfaz profesional para operar con hasta 100x de apalancamiento.' : 'Use our professional interface to trade with up to 100x leverage.'}</p>
                </div>
              </div>
              <div className="doc-section">
                <h2><Layers size={24} /> {language === 'es' ? 'Arquitectura del Protocolo' : 'Protocol Architecture'}</h2>
                <div className="architecture-diagram">
                  <div className="arch-layer">
                    <span className="layer-name">{language === 'es' ? 'Capa de Usuario' : 'User Layer'}</span>
                    <span className="layer-desc">Web3 dApp Interface</span>
                  </div>
                  <div className="arch-arrow">↓</div>
                  <div className="arch-layer">
                    <span className="layer-name">{language === 'es' ? 'Capa de Smart Contracts' : 'Smart Contract Layer'}</span>
                    <span className="layer-desc">Trading Engine, Liquidity Pools</span>
                  </div>
                  <div className="arch-arrow">↓</div>
                  <div className="arch-layer">
                    <span className="layer-name">{language === 'es' ? 'Capa de Oracle' : 'Oracle Layer'}</span>
                    <span className="layer-desc">Real-time FX Pricing Feeds</span>
                  </div>
                  <div className="arch-arrow">↓</div>
                  <div className="arch-layer highlight">
                    <span className="layer-name">LemonChain Network</span>
                    <span className="layer-desc">High-speed Settlement Layer</span>
                  </div>
                </div>
              </div>
              <div className="doc-section">
                <h2><Shield size={24} /> {language === 'es' ? 'Seguridad' : 'Security'}</h2>
                <ul className="security-list">
                  <li><CheckCircle size={16} /> {language === 'es' ? 'Smart contracts auditados por firmas líderes' : 'Smart contracts audited by leading firms'}</li>
                  <li><CheckCircle size={16} /> {language === 'es' ? 'Pruebas de reserva on-chain 24/7' : '24/7 on-chain proof of reserves'}</li>
                  <li><CheckCircle size={16} /> {language === 'es' ? 'Programa de bug bounty activo' : 'Active bug bounty program'}</li>
                  <li><CheckCircle size={16} /> {language === 'es' ? 'Seguro de fondos hasta $50M' : 'Fund insurance up to $50M'}</li>
                </ul>
              </div>
            </div>
          </SubpageWrapper>
        );
      
      case 'smart-contracts':
        return (
          <SubpageWrapper title={language === 'es' ? 'Smart Contracts' : 'Smart Contracts'}>
            <div className="contracts-list">
              <div className="contract-card">
                <div className="contract-header">
                  <div className="contract-icon"><Database size={24} /></div>
                  <div className="contract-info">
                    <h3>FxDefiCore.sol</h3>
                    <span className="contract-address">0x742d35Cc6634C0532925a3b844Bc9e7595f...</span>
                  </div>
                  <span className="contract-status verified"><ShieldCheck size={14} /> Verified</span>
                </div>
                <p>{language === 'es' ? 'Contrato principal del protocolo. Maneja la lógica de trading y liquidaciones.' : 'Main protocol contract. Handles trading logic and liquidations.'}</p>
                <div className="contract-stats">
                  <div className="stat"><span className="label">TVL</span><span className="value">$124.5M</span></div>
                  <div className="stat"><span className="label">Transactions</span><span className="value">1.2M+</span></div>
                  <div className="stat"><span className="label">Version</span><span className="value">v2.1.0</span></div>
                </div>
              </div>
              <div className="contract-card">
                <div className="contract-header">
                  <div className="contract-icon"><Coins size={24} /></div>
                  <div className="contract-info">
                    <h3>LiquidityPool.sol</h3>
                    <span className="contract-address">0x1a2B3c4D5e6F7890AbCdEf1234567890AbCd...</span>
                  </div>
                  <span className="contract-status verified"><ShieldCheck size={14} /> Verified</span>
                </div>
                <p>{language === 'es' ? 'Pools de liquidez para todos los pares de trading tokenizados.' : 'Liquidity pools for all tokenized trading pairs.'}</p>
                <div className="contract-stats">
                  <div className="stat"><span className="label">Pairs</span><span className="value">105</span></div>
                  <div className="stat"><span className="label">Providers</span><span className="value">8.4K</span></div>
                  <div className="stat"><span className="label">APY</span><span className="value">12.5%</span></div>
                </div>
              </div>
              <div className="contract-card">
                <div className="contract-header">
                  <div className="contract-icon"><Lock size={24} /></div>
                  <div className="contract-info">
                    <h3>CollateralVault.sol</h3>
                    <span className="contract-address">0x9876543210FeDcBa0987654321FeDcBa09...</span>
                  </div>
                  <span className="contract-status verified"><ShieldCheck size={14} /> Verified</span>
                </div>
                <p>{language === 'es' ? 'Gestión segura de colateral para posiciones apalancadas.' : 'Secure collateral management for leveraged positions.'}</p>
                <div className="contract-stats">
                  <div className="stat"><span className="label">Locked</span><span className="value">$89.2M</span></div>
                  <div className="stat"><span className="label">Users</span><span className="value">15.2K</span></div>
                  <div className="stat"><span className="label">Health</span><span className="value">98.7%</span></div>
                </div>
              </div>
            </div>
          </SubpageWrapper>
        );
      
      case 'audit-reports':
        return (
          <SubpageWrapper title={language === 'es' ? 'Reportes de Auditoría' : 'Audit Reports'}>
            <div className="audits-grid">
              <div className="audit-card">
                <div className="audit-header">
                  <img src="https://via.placeholder.com/60x60?text=C" alt="Certik" className="audit-logo" />
                  <div className="audit-info">
                    <h3>Certik Security Audit</h3>
                    <span className="audit-date">December 2025</span>
                  </div>
                  <span className="audit-score">Score: 95/100</span>
                </div>
                <div className="audit-findings">
                  <div className="finding"><span className="severity critical">0</span> Critical</div>
                  <div className="finding"><span className="severity high">0</span> High</div>
                  <div className="finding"><span className="severity medium">2</span> Medium (Resolved)</div>
                  <div className="finding"><span className="severity low">4</span> Low (Resolved)</div>
                </div>
                <button className="download-audit-btn"><FileText size={16} /> {language === 'es' ? 'Descargar PDF' : 'Download PDF'}</button>
              </div>
              <div className="audit-card">
                <div className="audit-header">
                  <img src="https://via.placeholder.com/60x60?text=OZ" alt="OpenZeppelin" className="audit-logo" />
                  <div className="audit-info">
                    <h3>OpenZeppelin Audit</h3>
                    <span className="audit-date">November 2025</span>
                  </div>
                  <span className="audit-score">Score: 92/100</span>
                </div>
                <div className="audit-findings">
                  <div className="finding"><span className="severity critical">0</span> Critical</div>
                  <div className="finding"><span className="severity high">0</span> High</div>
                  <div className="finding"><span className="severity medium">1</span> Medium (Resolved)</div>
                  <div className="finding"><span className="severity low">6</span> Low (Resolved)</div>
                </div>
                <button className="download-audit-btn"><FileText size={16} /> {language === 'es' ? 'Descargar PDF' : 'Download PDF'}</button>
              </div>
              <div className="audit-card pending">
                <div className="audit-header">
                  <img src="https://via.placeholder.com/60x60?text=T" alt="Trail of Bits" className="audit-logo" />
                  <div className="audit-info">
                    <h3>Trail of Bits Audit</h3>
                    <span className="audit-date">{language === 'es' ? 'En Progreso' : 'In Progress'}</span>
                  </div>
                  <span className="audit-score pending">{language === 'es' ? 'Pendiente' : 'Pending'}</span>
                </div>
                <p className="audit-pending-msg">{language === 'es' ? 'Auditoría programada para Q1 2026' : 'Audit scheduled for Q1 2026'}</p>
              </div>
            </div>
          </SubpageWrapper>
        );
      
      case 'api-docs':
        return (
          <SubpageWrapper title="API Documentation">
            <div className="api-docs">
              <div className="api-sidebar">
                <h4>{language === 'es' ? 'Endpoints' : 'Endpoints'}</h4>
                <ul>
                  <li className="active">GET /v1/markets</li>
                  <li>GET /v1/orderbook/:pair</li>
                  <li>GET /v1/trades/:pair</li>
                  <li>POST /v1/orders</li>
                  <li>DELETE /v1/orders/:id</li>
                  <li>GET /v1/account</li>
                  <li>GET /v1/positions</li>
                  <li>WebSocket /v1/ws</li>
                </ul>
              </div>
              <div className="api-content">
                <div className="api-endpoint">
                  <h3><span className="method get">GET</span> /v1/markets</h3>
                  <p>{language === 'es' ? 'Obtiene todos los mercados disponibles con información en tiempo real.' : 'Get all available markets with real-time information.'}</p>
                  <div className="code-block">
                    <pre>{`// Response Example
{
  "markets": [
    {
      "symbol": "VUSD/VEUR",
      "baseAsset": "VUSD",
      "quoteAsset": "VEUR",
      "lastPrice": "0.92145",
      "volume24h": "125420000",
      "high24h": "0.92890",
      "low24h": "0.91234",
      "change24h": "+0.45%"
    }
  ]
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </SubpageWrapper>
        );
      
      case 'trading-guide':
        return (
          <SubpageWrapper title={language === 'es' ? 'Guía de Trading' : 'Trading Guide'}>
            <div className="guide-content">
              <div className="guide-section">
                <h2><Target size={24} /> {language === 'es' ? 'Tipos de Órdenes' : 'Order Types'}</h2>
                <div className="order-types-grid">
                  <div className="order-type-card">
                    <h4>{language === 'es' ? 'Orden de Mercado' : 'Market Order'}</h4>
                    <p>{language === 'es' ? 'Ejecución inmediata al mejor precio disponible.' : 'Immediate execution at the best available price.'}</p>
                  </div>
                  <div className="order-type-card">
                    <h4>{language === 'es' ? 'Orden Límite' : 'Limit Order'}</h4>
                    <p>{language === 'es' ? 'Se ejecuta solo al precio especificado o mejor.' : 'Executes only at the specified price or better.'}</p>
                  </div>
                  <div className="order-type-card">
                    <h4>Stop-Loss</h4>
                    <p>{language === 'es' ? 'Cierra automáticamente tu posición para limitar pérdidas.' : 'Automatically closes your position to limit losses.'}</p>
                  </div>
                  <div className="order-type-card">
                    <h4>Take-Profit</h4>
                    <p>{language === 'es' ? 'Asegura ganancias cerrando en un nivel objetivo.' : 'Secures profits by closing at a target level.'}</p>
                  </div>
                </div>
              </div>
              <div className="guide-section">
                <h2><BarChart3 size={24} /> {language === 'es' ? 'Análisis Técnico' : 'Technical Analysis'}</h2>
                <p>{language === 'es' ? 'FxDefi incluye herramientas avanzadas de análisis técnico:' : 'FxDefi includes advanced technical analysis tools:'}</p>
                <ul className="feature-list">
                  <li>Candlestick charts with 20+ timeframes</li>
                  <li>50+ technical indicators (RSI, MACD, Bollinger Bands...)</li>
                  <li>Drawing tools (Fibonacci, Trendlines, Channels...)</li>
                  <li>AI-powered pattern recognition</li>
                  <li>Real-time alerts and notifications</li>
                </ul>
              </div>
            </div>
          </SubpageWrapper>
        );
      
      case 'faq':
        return (
          <SubpageWrapper title="FAQ">
            <div className="faq-list">
              {[
                { q: language === 'es' ? '¿Qué es FxDefi.world?' : 'What is FxDefi.world?', 
                  a: language === 'es' ? 'FxDefi.world es una plataforma descentralizada de trading de divisas tokenizadas construida sobre LemonChain. Permite operar con pares de forex tradicionales en formato de activos digitales con liquidación instantánea.' : 'FxDefi.world is a decentralized tokenized forex trading platform built on LemonChain. It allows trading traditional forex pairs in digital asset format with instant settlement.' },
                { q: language === 'es' ? '¿Cómo funciona la tokenización?' : 'How does tokenization work?', 
                  a: language === 'es' ? 'Cada moneda fiat está respaldada 1:1 por reservas verificables en tiempo real. VUSD está respaldado por dólares, VEUR por euros, etc. Los precios se actualizan mediante oracles descentralizados.' : 'Each fiat currency is backed 1:1 by real-time verifiable reserves. VUSD is backed by dollars, VEUR by euros, etc. Prices are updated via decentralized oracles.' },
                { q: language === 'es' ? '¿Cuál es el apalancamiento máximo?' : 'What is the maximum leverage?', 
                  a: language === 'es' ? 'Ofrecemos hasta 100x de apalancamiento en los principales pares de divisas. El apalancamiento disponible varía según el par y las condiciones del mercado.' : 'We offer up to 100x leverage on major currency pairs. Available leverage varies by pair and market conditions.' },
                { q: language === 'es' ? '¿Es seguro operar en FxDefi?' : 'Is it safe to trade on FxDefi?', 
                  a: language === 'es' ? 'Sí. Todos nuestros smart contracts han sido auditados por firmas líderes como Certik y OpenZeppelin. Además, mantenemos un seguro de fondos y pruebas de reserva on-chain 24/7.' : 'Yes. All our smart contracts have been audited by leading firms like Certik and OpenZeppelin. We also maintain fund insurance and 24/7 on-chain proof of reserves.' },
                { q: language === 'es' ? '¿Cuáles son las comisiones?' : 'What are the fees?', 
                  a: language === 'es' ? 'Las comisiones de trading son de 0.02% para makers y 0.05% para takers. No hay comisiones de depósito ni retiro en LemonChain.' : 'Trading fees are 0.02% for makers and 0.05% for takers. There are no deposit or withdrawal fees on LemonChain.' },
              ].map((item, i) => (
                <div key={i} className="faq-item">
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </SubpageWrapper>
        );
      
      case 'blog':
        return (
          <SubpageWrapper title="Blog">
            <div className="blog-grid">
              {[
                { title: language === 'es' ? 'El Futuro del Trading de Divisas: Tokenización y DeFi' : 'The Future of Forex Trading: Tokenization and DeFi', date: 'Jan 15, 2026', category: 'Vision', image: '📊' },
                { title: language === 'es' ? 'Cómo FxDefi está Revolucionando el Mercado de $7.5T' : 'How FxDefi is Revolutionizing the $7.5T Market', date: 'Jan 10, 2026', category: 'Technology', image: '🚀' },
                { title: language === 'es' ? 'Guía Completa de Trading con Apalancamiento' : 'Complete Guide to Leveraged Trading', date: 'Jan 5, 2026', category: 'Education', image: '📈' },
                { title: language === 'es' ? 'Asociación Estratégica con LemonChain Anunciada' : 'Strategic Partnership with LemonChain Announced', date: 'Dec 28, 2025', category: 'News', image: '🤝' },
              ].map((post, i) => (
                <div key={i} className="blog-card">
                  <div className="blog-image">{post.image}</div>
                  <div className="blog-content">
                    <span className="blog-category">{post.category}</span>
                    <h3>{post.title}</h3>
                    <span className="blog-date">{post.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </SubpageWrapper>
        );
      
      case 'terms':
        return (
          <SubpageWrapper title={language === 'es' ? 'Términos de Servicio' : 'Terms of Service'}>
            <div className="legal-content">
              <p className="last-updated">{language === 'es' ? 'Última actualización: 15 de Enero, 2026' : 'Last updated: January 15, 2026'}</p>
              <section>
                <h2>1. {language === 'es' ? 'Aceptación de Términos' : 'Acceptance of Terms'}</h2>
                <p>{language === 'es' ? 'Al acceder o utilizar FxDefi.world, usted acepta estar sujeto a estos Términos de Servicio y todas las leyes y regulaciones aplicables.' : 'By accessing or using FxDefi.world, you agree to be bound by these Terms of Service and all applicable laws and regulations.'}</p>
              </section>
              <section>
                <h2>2. {language === 'es' ? 'Elegibilidad' : 'Eligibility'}</h2>
                <p>{language === 'es' ? 'Debe tener al menos 18 años y no estar restringido por ninguna sanción o ley local para usar nuestros servicios.' : 'You must be at least 18 years old and not restricted by any sanctions or local law to use our services.'}</p>
              </section>
              <section>
                <h2>3. {language === 'es' ? 'Servicios de Trading' : 'Trading Services'}</h2>
                <p>{language === 'es' ? 'FxDefi proporciona acceso a trading descentralizado de divisas tokenizadas. No somos custodios de sus fondos y usted mantiene control total de sus activos en todo momento.' : 'FxDefi provides access to decentralized tokenized forex trading. We are not custodians of your funds and you maintain full control of your assets at all times.'}</p>
              </section>
              <section>
                <h2>4. {language === 'es' ? 'Riesgos' : 'Risks'}</h2>
                <p>{language === 'es' ? 'El trading con apalancamiento conlleva riesgos significativos. Puede perder más que su depósito inicial. Solo opere con fondos que pueda permitirse perder.' : 'Leveraged trading carries significant risks. You may lose more than your initial deposit. Only trade with funds you can afford to lose.'}</p>
              </section>
            </div>
          </SubpageWrapper>
        );
      
      case 'privacy':
        return (
          <SubpageWrapper title={language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}>
            <div className="legal-content">
              <p className="last-updated">{language === 'es' ? 'Última actualización: 15 de Enero, 2026' : 'Last updated: January 15, 2026'}</p>
              <section>
                <h2>1. {language === 'es' ? 'Información que Recopilamos' : 'Information We Collect'}</h2>
                <p>{language === 'es' ? 'Como plataforma descentralizada, minimizamos la recopilación de datos personales. Solo almacenamos direcciones de wallet públicas y datos de transacciones en blockchain (que son públicos por naturaleza).' : 'As a decentralized platform, we minimize personal data collection. We only store public wallet addresses and on-chain transaction data (which is public by nature).'}</p>
              </section>
              <section>
                <h2>2. {language === 'es' ? 'Cookies y Análisis' : 'Cookies and Analytics'}</h2>
                <p>{language === 'es' ? 'Utilizamos cookies esenciales para el funcionamiento del sitio y análisis agregados anónimos para mejorar la experiencia del usuario.' : 'We use essential cookies for site functionality and anonymous aggregated analytics to improve user experience.'}</p>
              </section>
              <section>
                <h2>3. {language === 'es' ? 'Seguridad de Datos' : 'Data Security'}</h2>
                <p>{language === 'es' ? 'Implementamos medidas de seguridad estándar de la industria. Sin embargo, dado que operamos en blockchain, las transacciones son inmutables y públicas.' : 'We implement industry-standard security measures. However, since we operate on blockchain, transactions are immutable and public.'}</p>
              </section>
            </div>
          </SubpageWrapper>
        );
      
      case 'risk-disclosure':
        return (
          <SubpageWrapper title={language === 'es' ? 'Divulgación de Riesgos' : 'Risk Disclosure'}>
            <div className="legal-content risk-disclosure">
              <div className="risk-warning">
                <AlertCircle size={32} />
                <h2>{language === 'es' ? 'ADVERTENCIA DE ALTO RIESGO' : 'HIGH RISK WARNING'}</h2>
              </div>
              <section>
                <h3>{language === 'es' ? 'Riesgo de Pérdida' : 'Risk of Loss'}</h3>
                <p>{language === 'es' ? 'El trading de derivados y productos apalancados conlleva un alto nivel de riesgo. Puede perder más que su inversión inicial. No invierta dinero que no pueda permitirse perder.' : 'Trading derivatives and leveraged products carries a high level of risk. You may lose more than your initial investment. Do not invest money you cannot afford to lose.'}</p>
              </section>
              <section>
                <h3>{language === 'es' ? 'Volatilidad del Mercado' : 'Market Volatility'}</h3>
                <p>{language === 'es' ? 'Los mercados de criptomonedas y forex son altamente volátiles. Los precios pueden fluctuar significativamente en períodos muy cortos.' : 'Cryptocurrency and forex markets are highly volatile. Prices can fluctuate significantly in very short periods.'}</p>
              </section>
              <section>
                <h3>{language === 'es' ? 'Riesgo de Liquidación' : 'Liquidation Risk'}</h3>
                <p>{language === 'es' ? 'Las posiciones apalancadas pueden ser liquidadas automáticamente si el valor de su colateral cae por debajo del nivel de mantenimiento requerido.' : 'Leveraged positions may be automatically liquidated if your collateral value falls below the required maintenance level.'}</p>
              </section>
              <section>
                <h3>{language === 'es' ? 'Riesgo de Smart Contract' : 'Smart Contract Risk'}</h3>
                <p>{language === 'es' ? 'Aunque nuestros contratos han sido auditados, existe riesgo inherente en cualquier software. Los bugs o vulnerabilidades podrían resultar en pérdida de fondos.' : 'Although our contracts have been audited, there is inherent risk in any software. Bugs or vulnerabilities could result in loss of funds.'}</p>
              </section>
            </div>
          </SubpageWrapper>
        );
      
      case 'compliance':
        return (
          <SubpageWrapper title={language === 'es' ? 'Cumplimiento Regulatorio' : 'Regulatory Compliance'}>
            <div className="legal-content">
              <section>
                <h2>{language === 'es' ? 'Nuestro Enfoque de Cumplimiento' : 'Our Compliance Approach'}</h2>
                <p>{language === 'es' ? 'FxDefi.world opera como un protocolo descentralizado. Sin embargo, nos comprometemos a cumplir con las regulaciones aplicables y a cooperar con las autoridades cuando sea requerido.' : 'FxDefi.world operates as a decentralized protocol. However, we are committed to complying with applicable regulations and cooperating with authorities when required.'}</p>
              </section>
              <section>
                <h2>{language === 'es' ? 'Restricciones Geográficas' : 'Geographic Restrictions'}</h2>
                <p>{language === 'es' ? 'Nuestros servicios no están disponibles para residentes de jurisdicciones sancionadas incluyendo: EE.UU., Corea del Norte, Irán, Cuba, Siria, y regiones de Crimea.' : 'Our services are not available to residents of sanctioned jurisdictions including: USA, North Korea, Iran, Cuba, Syria, and Crimea regions.'}</p>
              </section>
              <section>
                <h2>{language === 'es' ? 'Anti-Lavado de Dinero (AML)' : 'Anti-Money Laundering (AML)'}</h2>
                <p>{language === 'es' ? 'Implementamos análisis on-chain y trabajamos con proveedores de cumplimiento para detectar y prevenir actividades ilícitas en la plataforma.' : 'We implement on-chain analytics and work with compliance providers to detect and prevent illicit activities on the platform.'}</p>
              </section>
              <section>
                <h2>{language === 'es' ? 'Contacto de Cumplimiento' : 'Compliance Contact'}</h2>
                <p>{language === 'es' ? 'Para consultas relacionadas con cumplimiento, contáctenos en: compliance@fxdefi.world' : 'For compliance-related inquiries, contact us at: compliance@fxdefi.world'}</p>
              </section>
            </div>
          </SubpageWrapper>
        );
      
      default:
        return null;
    }
  };

  // If showing a subpage, render it instead of main content
  if (activeSubpage !== 'main') {
    return (
      <>
        <style>{platformStyles}</style>
        <style>{subpageStyles}</style>
        {renderSubpage()}
      </>
    );
  }

  return (
    <>
      <style>{platformStyles}</style>
      <div className="platform-page">
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        
        {/* Background with Particles Effect */}
        <div className="platform-bg">
          <div className="particles">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${10 + Math.random() * 20}s`
              }} />
            ))}
          </div>
        </div>

        {/* Live Market Ticker */}
        <div className="live-ticker">
          <div className="ticker-label">
            <Activity size={12} />
            <span>LIVE</span>
          </div>
          <div className="ticker-track">
            <div className="ticker-content">
              {[...tickerData, ...tickerData].map((item, i) => (
                <div key={i} className="ticker-item">
                  <span className="ticker-symbol">{item.symbol}</span>
                  <span className="ticker-price">{item.price > 100 ? item.price.toFixed(2) : item.price.toFixed(4)}</span>
                  <span className={`ticker-change ${item.change >= 0 ? 'up' : 'down'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="platform-header">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <div className="logo-icon"><TrendingUp size={22} /></div>
                <span className="logo-text">FxDefi<span className="logo-accent">.world</span></span>
              </div>
              <nav className="main-nav">
                <a href="#terminal">Trading</a>
                <a href="#currencies">Currencies</a>
                <a href="#commodities">Commodities</a>
                <a href="#features">Features</a>
                <a href="#roadmap">Roadmap</a>
              </nav>
            </div>
            <div className="header-right">
              <div className="lang-switch">
                <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
                <button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')}>ES</button>
              </div>
              
              {/* Wallet Connection */}
              <div className="wallet-section">
                {!walletConnected ? (
                  <button 
                    className="connect-wallet-btn"
                    onClick={connectWallet}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Wallet size={16} />
                        <span>Connect Wallet</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="wallet-connected">
                    <button 
                      className="wallet-info-btn"
                      onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                    >
                      <div className="wallet-status-dot" />
                      <span className="wallet-balance">${walletBalance} VUSD</span>
                      <span className="wallet-addr">{formatAddress(walletAddress)}</span>
                      <ChevronDown size={14} />
                    </button>
                    
                    {showWalletDropdown && (
                      <div className="wallet-dropdown">
                        <div className="wallet-dropdown-header">
                          <span className="connected-label">
                            <CheckCircle size={14} /> Connected to LemonChain
                          </span>
                        </div>
                        <div className="wallet-dropdown-balance">
                          <span className="balance-label">Balance</span>
                          <span className="balance-value">${walletBalance} VUSD</span>
                        </div>
                        <div className="wallet-dropdown-address">
                          <span className="address-full">{walletAddress}</span>
                          <button onClick={copyAddress} title="Copy address">
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="wallet-dropdown-actions">
                          <button className="deposit-btn">
                            <ArrowDownRight size={14} /> Deposit
                          </button>
                          <button className="withdraw-btn">
                            <ArrowUpRight size={14} /> Withdraw
                          </button>
                        </div>
                        <button className="disconnect-btn" onClick={disconnectWallet}>
                          <LogOut size={14} /> Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <a href="/" className="back-btn" title="Back to LemonMinted"><ArrowLeft size={18} /></a>
              <span className="launch-badge"><Sparkles size={12} />{t.launching}</span>
            </div>
          </div>
        </header>

        {/* Hero Section with Animations */}
        <section className={`hero-section ${isHeroVisible ? 'visible' : ''}`} ref={heroRef}>
          <div className="hero-content">
            <div className="coming-soon-banner animate-item delay-1">
              <Sparkles size={20} />
              <span className="coming-soon-text">{language === 'es' ? 'MUY PRONTO EN 2026' : 'COMING SOON 2026'}</span>
              <Sparkles size={20} />
            </div>
            <div className="hero-badge animate-item delay-2"><Globe size={14} />Decentralized Forex & Commodities on LemonChain</div>
            <h1 className="animate-item delay-3">{t.heroTitle} <span className="gradient">{t.heroHighlight}</span></h1>
            <p className="animate-item delay-4">{t.heroDesc}</p>
            <div className="hero-stats animate-item delay-5">
              <div className="stat glass-card">
                <span className="value" ref={pairsCounter.ref}>{pairsCounter.count}</span>
                <span className="label">{t.currencyPairs}</span>
              </div>
              <div className="stat glass-card">
                <span className="value" ref={commoditiesCounter.ref}>{commoditiesCounter.count}</span>
                <span className="label">{t.commoditiesLabel}</span>
              </div>
              <div className="stat glass-card">
                <span className="value" ref={volumeCounter.ref}>{volumeCounter.count}</span>
                <span className="label">{t.dailyVolume}</span>
              </div>
              <div className="stat glass-card">
                <span className="value" ref={tradingHoursCounter.ref}>{tradingHoursCounter.count}</span>
                <span className="label">{t.globalTrading}</span>
              </div>
              <div className="stat glass-card">
                <span className="value" ref={settlementCounter.ref}>{settlementCounter.count}</span>
                <span className="label">{t.settlement}</span>
              </div>
            </div>
            <div className="hero-actions animate-item delay-6">
              <a href="/fxdefi/whitepaper" className="btn-primary btn-glow"><FileText size={16} />{t.readWhitepaper}</a>
            </div>
          </div>
        </section>

        {/* Market Sentiment & Top Movers Section */}
        <section className="market-overview-section">
          <div className="market-overview-grid">
            {/* Fear & Greed Index */}
            <div className="sentiment-card glass-card">
              <div className="sentiment-header">
                <Flame size={18} />
                <span>{language === 'es' ? 'Índice Miedo/Codicia' : 'Fear & Greed Index'}</span>
              </div>
              <div className="sentiment-gauge">
                <svg viewBox="0 0 200 100" className="gauge-arc">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444"/>
                      <stop offset="25%" stopColor="#f59e0b"/>
                      <stop offset="50%" stopColor="#eab308"/>
                      <stop offset="75%" stopColor="#84cc16"/>
                      <stop offset="100%" stopColor="#22c55e"/>
                    </linearGradient>
                  </defs>
                  <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"/>
                  <line 
                    x1="100" y1="90" 
                    x2={100 + 60 * Math.cos((Math.PI) - (fearGreedIndex / 100) * Math.PI)} 
                    y2={90 - 60 * Math.sin((Math.PI) - (fearGreedIndex / 100) * Math.PI)} 
                    stroke="#fff" strokeWidth="3" strokeLinecap="round"
                  />
                  <circle cx="100" cy="90" r="6" fill="#A3E635"/>
                </svg>
                <div className="sentiment-value">{fearGreedIndex}</div>
                <div className="sentiment-label">
                  {fearGreedIndex < 25 ? (language === 'es' ? 'Miedo Extremo' : 'Extreme Fear') :
                   fearGreedIndex < 45 ? (language === 'es' ? 'Miedo' : 'Fear') :
                   fearGreedIndex < 55 ? (language === 'es' ? 'Neutral' : 'Neutral') :
                   fearGreedIndex < 75 ? (language === 'es' ? 'Codicia' : 'Greed') :
                   (language === 'es' ? 'Codicia Extrema' : 'Extreme Greed')}
                </div>
              </div>
            </div>

            {/* Market Sentiment */}
            <div className="sentiment-card glass-card">
              <div className="sentiment-header">
                <BarChart3 size={18} />
                <span>{language === 'es' ? 'Sentimiento del Mercado' : 'Market Sentiment'}</span>
              </div>
              <div className="sentiment-bars">
                <div className="sentiment-bar-item">
                  <span className="bar-label">{language === 'es' ? 'Alcista' : 'Bullish'}</span>
                  <div className="bar-track">
                    <div className="bar-fill bullish" style={{width: `${marketSentiment}%`}}/>
                  </div>
                  <span className="bar-value">{marketSentiment.toFixed(0)}%</span>
                </div>
                <div className="sentiment-bar-item">
                  <span className="bar-label">{language === 'es' ? 'Bajista' : 'Bearish'}</span>
                  <div className="bar-track">
                    <div className="bar-fill bearish" style={{width: `${100 - marketSentiment}%`}}/>
                  </div>
                  <span className="bar-value">{(100 - marketSentiment).toFixed(0)}%</span>
                </div>
              </div>
              <div className="sentiment-indicator">
                <TrendingUp size={14} />
                <span>{language === 'es' ? 'Tendencia General: ' : 'Overall Trend: '}</span>
                <strong className={marketSentiment > 50 ? 'bullish' : 'bearish'}>
                  {marketSentiment > 50 ? (language === 'es' ? 'ALCISTA' : 'BULLISH') : (language === 'es' ? 'BAJISTA' : 'BEARISH')}
                </strong>
              </div>
            </div>

            {/* Top Movers */}
            <div className="top-movers-card glass-card">
              <div className="sentiment-header">
                <Trophy size={18} />
                <span>{language === 'es' ? 'Top Movers 24h' : 'Top Movers 24h'}</span>
              </div>
              <div className="movers-list">
                {topMovers.map((mover, i) => (
                  <div key={i} className="mover-item">
                    <span className="mover-rank">#{i + 1}</span>
                    <span className="mover-symbol">{mover.symbol}</span>
                    <span className={`mover-change ${mover.change >= 0 ? 'up' : 'down'}`}>
                      {mover.change >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                      {Math.abs(mover.change).toFixed(2)}%
                    </span>
                    <span className="mover-volume">{mover.volume}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Stats */}
            <div className="trading-stats-card glass-card">
              <div className="sentiment-header">
                <Activity size={18} />
                <span>{language === 'es' ? 'Estadísticas 24h' : '24h Statistics'}</span>
              </div>
              <div className="stats-mini-grid">
                <div className="stat-mini">
                  <span className="stat-mini-value">$2.4B</span>
                  <span className="stat-mini-label">{language === 'es' ? 'Volumen' : 'Volume'}</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-mini-value">847K</span>
                  <span className="stat-mini-label">{language === 'es' ? 'Trades' : 'Trades'}</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-mini-value">0.02%</span>
                  <span className="stat-mini-label">{language === 'es' ? 'Spread Prom' : 'Avg Spread'}</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-mini-value">15.2K</span>
                  <span className="stat-mini-label">{language === 'es' ? 'Usuarios' : 'Users'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* PROFESSIONAL TRADING TERMINAL - TRADINGVIEW STYLE */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <section id="terminal" className="section">
          <div className="section-header">
            <div className="section-icon"><Activity size={24} /></div>
            <div>
              <h2>{t.tradingTerminal}</h2>
              <p>{t.tradingTerminalDesc}</p>
            </div>
          </div>

          <div className={`trading-platform ${isFullscreen ? 'fullscreen' : ''}`} ref={chartRef}>
            {/* Platform Top Bar */}
            <div className="platform-topbar">
              <div className="topbar-left">
                <div className="symbol-selector">
                  <span className="current-symbol">{selectedSymbol.symbol}</span>
                  <span className="symbol-exchange">• FxDefi</span>
                  <span className={`market-status ${walletConnected ? 'connected' : ''}`}>
                    {walletConnected ? '● LIVE TRADING' : '○ CONNECT TO TRADE'}
                  </span>
                </div>
                <div className="timeframe-selector">
                  {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'].map(tf => (
                    <button 
                      key={tf} 
                      className={tf === selectedTimeframe ? 'active' : ''}
                      onClick={() => setSelectedTimeframe(tf)}
                    >{tf}</button>
                  ))}
                </div>
                {/* Chart Type Selector */}
                <div className="chart-type-selector">
                  <button 
                    className={chartType === 'candle' ? 'active' : ''} 
                    onClick={() => setChartType('candle')}
                    title="Candlestick"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button 
                    className={chartType === 'line' ? 'active' : ''} 
                    onClick={() => setChartType('line')}
                    title="Line"
                  >
                    <TrendingUp size={14} />
                  </button>
                  <button 
                    className={chartType === 'area' ? 'active' : ''} 
                    onClick={() => setChartType('area')}
                    title="Area"
                  >
                    <Activity size={14} />
                  </button>
                </div>
              </div>
              <div className="topbar-right">
                {/* Indicator Toggles */}
                <div className="indicator-toggles">
                  <button 
                    className={`indicator-btn ${showBollingerBands ? 'active' : ''}`}
                    onClick={() => setShowBollingerBands(!showBollingerBands)}
                    title="Bollinger Bands (Alt+B)"
                  >
                    BB
                  </button>
                  <button 
                    className={`indicator-btn ${showStochastic ? 'active' : ''}`}
                    onClick={() => setShowStochastic(!showStochastic)}
                    title="Stochastic (Alt+S)"
                  >
                    STOCH
                  </button>
                </div>
                <div className="chart-controls">
                  <button title="Compare"><BarChart3 size={14} /></button>
                  <button title="Indicators" className="active"><Activity size={14} /></button>
                  <button 
                    title="Set Alert" 
                    onClick={() => setShowAlertModal(true)}
                    className={priceAlerts.some(a => a.active) ? 'has-alert' : ''}
                  >
                    <Bell size={14} />
                    {priceAlerts.filter(a => a.active).length > 0 && (
                      <span className="alert-badge">{priceAlerts.filter(a => a.active).length}</span>
                    )}
                  </button>
                  <button title="Replay"><RotateCcw size={14} /></button>
                  <button 
                    title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+F)"}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={isFullscreen ? 'active' : ''}
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button title="Settings"><Settings size={14} /></button>
                </div>
                <div className="time-display">{new Date().toLocaleTimeString('en-US', { hour12: false })} (UTC)</div>
              </div>
            </div>

            <div className="platform-body">
              {/* Left Sidebar - Tools */}
              <div className="toolbar-left">
                <button className="tool active" title="Cursor"><MousePointer size={16} /></button>
                <button className="tool" title="Crosshair"><Crosshair size={16} /></button>
                <button className="tool" title="Trend Line"><TrendIcon size={16} /></button>
                <button className="tool" title="Horizontal Line"><Minus size={16} /></button>
                <button className="tool" title="Fibonacci"><Hash size={16} /></button>
                <button className="tool" title="Text"><Type size={16} /></button>
                <button className="tool" title="Measure"><Percent size={16} /></button>
                <button className="tool" title="Zoom In"><ZoomIn size={16} /></button>
                <button className="tool" title="Zoom Out"><ZoomOut size={16} /></button>
                <div className="tool-divider" />
                <button className="tool" title="Magnet"><Grid size={16} /></button>
                <button className="tool" title="Lock"><Lock size={16} /></button>
              </div>

              {/* Main Chart Area */}
              <div className="chart-area">
                {/* Chart Header Info */}
                <div className="chart-info-bar">
                  <div className="ohlc-display">
                    <span className="label">O</span><span className="value">{formatPrice(ohlcData[ohlcData.length-1]?.o || selectedSymbol.last)}</span>
                    <span className="label">H</span><span className="value high">{formatPrice(ohlcData[ohlcData.length-1]?.h || selectedSymbol.last * 1.001)}</span>
                    <span className="label">L</span><span className="value low">{formatPrice(ohlcData[ohlcData.length-1]?.l || selectedSymbol.last * 0.999)}</span>
                    <span className="label">C</span><span className={`value ${selectedSymbol.changePercent >= 0 ? 'high' : 'low'}`}>{formatPrice(selectedSymbol.last)}</span>
                    <span className={`change ${selectedSymbol.changePercent >= 0 ? 'up' : 'down'}`}>
                      {formatChange(selectedSymbol.change, selectedSymbol.changePercent)}
                    </span>
                  </div>
                  <div className="indicator-labels">
                    <span className="indicator ma1">MA 9 close <b>{formatPrice(selectedSymbol.last * 0.9995)}</b></span>
                    <span className="indicator ma2">Env 20 10 close <b className="high">{formatPrice(selectedSymbol.last * 1.002)}</b> <b>{formatPrice(selectedSymbol.last * 0.998)}</b> <b className="low">{formatPrice(selectedSymbol.last * 0.995)}</b></span>
                  </div>
                  <div className="volume-display">
                    <span className="label">Vol</span>
                    <span className="value">30.831K</span>
                  </div>
                </div>

                {/* Main Candlestick Chart - Professional Style */}
                <div className="main-chart">
                  {(() => {
                    // Calculate price range for scaling
                    const visibleCandles = ohlcData.slice(-50);
                    if (visibleCandles.length === 0) return null;
                    
                    const allPrices = visibleCandles.flatMap(c => [c.h, c.l]);
                    const minPrice = Math.min(...allPrices);
                    const maxPrice = Math.max(...allPrices);
                    const priceRange = maxPrice - minPrice;
                    const padding = priceRange * 0.1;
                    const chartMin = minPrice - padding;
                    const chartMax = maxPrice + padding;
                    const chartHeight = 400;
                    const chartWidth = 900;
                    const candleWidth = 12;
                    const candleGap = 4;
                    
                    const priceToY = (price: number) => {
                      return chartHeight - ((price - chartMin) / (chartMax - chartMin)) * chartHeight;
                    };
                    
                    // Generate price levels for grid
                    const priceLevels = [];
                    const step = priceRange / 6;
                    for (let i = 0; i <= 7; i++) {
                      priceLevels.push(chartMin + step * i);
                    }
                    
                    return (
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="chart-svg">
                        <defs>
                          <linearGradient id="maGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={theme.accent.lemon} stopOpacity="0.2"/>
                            <stop offset="100%" stopColor={theme.accent.lemon} stopOpacity="0"/>
                          </linearGradient>
                          <linearGradient id="volumeGradientUp" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={theme.chart.up} stopOpacity="0.8"/>
                            <stop offset="100%" stopColor={theme.chart.up} stopOpacity="0.3"/>
                          </linearGradient>
                          <linearGradient id="volumeGradientDown" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={theme.chart.down} stopOpacity="0.8"/>
                            <stop offset="100%" stopColor={theme.chart.down} stopOpacity="0.3"/>
                          </linearGradient>
                        </defs>
                        
                        {/* Horizontal Grid Lines */}
                        {priceLevels.map((price, i) => (
                          <line 
                            key={`h${i}`} 
                            x1="0" 
                            y1={priceToY(price)} 
                            x2={chartWidth - 70} 
                            y2={priceToY(price)} 
                            stroke={theme.chart.grid} 
                            strokeWidth="1"
                            strokeDasharray="2,6"
                          />
                        ))}
                        
                        {/* Vertical Grid Lines */}
                        {visibleCandles.map((candle, i) => {
                          if (i % 5 !== 0) return null;
                          const x = i * (candleWidth + candleGap) + candleWidth / 2;
                          return (
                            <line 
                              key={`v${i}`} 
                              x1={x} 
                              y1="0" 
                              x2={x} 
                              y2={chartHeight} 
                              stroke={theme.chart.grid} 
                              strokeWidth="1"
                              strokeDasharray="2,6"
                            />
                          );
                        })}

                        {/* Bollinger Bands */}
                        {showBollingerBands && bollingerData.length > 0 && visibleCandles.length >= 20 && (() => {
                          const bbSlice = bollingerData.slice(-(visibleCandles.length - 19));
                          const startIndex = 19;
                          
                          // Upper Band
                          const upperPath = bbSlice.map((bb, i) => {
                            const x = (startIndex + i) * (candleWidth + candleGap) + candleWidth / 2;
                            return `${i === 0 ? 'M' : 'L'} ${x},${priceToY(bb.upper)}`;
                          }).join(' ');
                          
                          // Lower Band
                          const lowerPath = bbSlice.map((bb, i) => {
                            const x = (startIndex + i) * (candleWidth + candleGap) + candleWidth / 2;
                            return `${i === 0 ? 'M' : 'L'} ${x},${priceToY(bb.lower)}`;
                          }).join(' ');
                          
                          // Fill area between bands
                          const fillPath = upperPath + ' ' + bbSlice.slice().reverse().map((bb, i) => {
                            const x = (startIndex + bbSlice.length - 1 - i) * (candleWidth + candleGap) + candleWidth / 2;
                            return `L ${x},${priceToY(bb.lower)}`;
                          }).join(' ') + ' Z';
                          
                          return (
                            <g className="bollinger-bands">
                              {/* Fill between bands */}
                              <path d={fillPath} fill={theme.accent.cyan} opacity="0.08"/>
                              {/* Upper Band */}
                              <path d={upperPath} fill="none" stroke={theme.accent.cyan} strokeWidth="1.5" opacity="0.7" strokeDasharray="4,2"/>
                              {/* Middle Band (SMA 20) */}
                              <path 
                                d={bbSlice.map((bb, i) => {
                                  const x = (startIndex + i) * (candleWidth + candleGap) + candleWidth / 2;
                                  return `${i === 0 ? 'M' : 'L'} ${x},${priceToY(bb.middle)}`;
                                }).join(' ')}
                                fill="none" 
                                stroke={theme.accent.cyan} 
                                strokeWidth="1.5"
                                opacity="0.9"
                              />
                              {/* Lower Band */}
                              <path d={lowerPath} fill="none" stroke={theme.accent.cyan} strokeWidth="1.5" opacity="0.7" strokeDasharray="4,2"/>
                            </g>
                          );
                        })()}

                        {/* Moving Average Line (9 period) */}
                        {visibleCandles.length > 9 && (
                          <path 
                            d={`M ${visibleCandles.map((_, i) => {
                              if (i < 8) return '';
                              const ma = visibleCandles.slice(i - 8, i + 1).reduce((sum, c) => sum + c.c, 0) / 9;
                              const x = i * (candleWidth + candleGap) + candleWidth / 2;
                              return `${i === 8 ? 'M' : 'L'} ${x},${priceToY(ma)}`;
                            }).join(' ')}`}
                            fill="none" 
                            stroke={theme.accent.lemon} 
                            strokeWidth="2"
                            opacity="0.9"
                          />
                        )}

                        {/* Moving Average Line (20 period) */}
                        {visibleCandles.length > 20 && !showBollingerBands && (
                          <path 
                            d={`M ${visibleCandles.map((_, i) => {
                              if (i < 19) return '';
                              const ma = visibleCandles.slice(i - 19, i + 1).reduce((sum, c) => sum + c.c, 0) / 20;
                              const x = i * (candleWidth + candleGap) + candleWidth / 2;
                              return `${i === 19 ? 'M' : 'L'} ${x},${priceToY(ma)}`;
                            }).join(' ')}`}
                            fill="none" 
                            stroke={theme.chart.ma2} 
                            strokeWidth="2"
                            opacity="0.8"
                          />
                        )}

                        {/* Candlesticks - Large and Realistic */}
                        {visibleCandles.map((candle, i) => {
                          const x = i * (candleWidth + candleGap);
                          const isUp = candle.c >= candle.o;
                          const oY = priceToY(candle.o);
                          const cY = priceToY(candle.c);
                          const hY = priceToY(candle.h);
                          const lY = priceToY(candle.l);
                          const bodyTop = Math.min(oY, cY);
                          const bodyHeight = Math.max(Math.abs(cY - oY), 2);
                          const color = isUp ? theme.chart.up : theme.chart.down;
                          
                          return (
                            <g key={i} className="candle-group">
                              {/* Wick/Shadow */}
                              <line 
                                x1={x + candleWidth / 2} 
                                y1={hY} 
                                x2={x + candleWidth / 2} 
                                y2={lY} 
                                stroke={color} 
                                strokeWidth="1.5"
                              />
                              {/* Body */}
                              <rect 
                                x={x + 1} 
                                y={bodyTop} 
                                width={candleWidth - 2} 
                                height={bodyHeight} 
                                fill={isUp ? color : color}
                                stroke={color}
                                strokeWidth="1"
                                rx="1"
                              />
                              {/* Hollow for up candles (professional style) */}
                              {isUp && bodyHeight > 4 && (
                                <rect 
                                  x={x + 2} 
                                  y={bodyTop + 1} 
                                  width={candleWidth - 4} 
                                  height={bodyHeight - 2} 
                                  fill={theme.bg.primary}
                                  rx="0.5"
                                />
                              )}
                            </g>
                          );
                        })}

                        {/* Buy Limit Order Line */}
                        {walletConnected && (
                          <>
                            <line 
                              x1="300" 
                              y1={priceToY(visibleCandles[visibleCandles.length - 1]?.c * 0.998 || 0)} 
                              x2={chartWidth - 80} 
                              y2={priceToY(visibleCandles[visibleCandles.length - 1]?.c * 0.998 || 0)} 
                              stroke={theme.accent.blue} 
                              strokeWidth="2"
                              strokeDasharray="4,4"
                            />
                            <rect 
                              x="300" 
                              y={priceToY(visibleCandles[visibleCandles.length - 1]?.c * 0.998 || 0) - 12} 
                              width="100" 
                              height="24" 
                              fill={theme.accent.blue} 
                              rx="4"
                            />
                            <text 
                              x="310" 
                              y={priceToY(visibleCandles[visibleCandles.length - 1]?.c * 0.998 || 0) + 5} 
                              fill="white" 
                              fontSize="11" 
                              fontWeight="600"
                            >{orderAmount} Buy Limit</text>
                          </>
                        )}

                        {/* Current Price Line */}
                        <line 
                          x1="0" 
                          y1={priceToY(selectedSymbol.last)} 
                          x2={chartWidth - 70} 
                          y2={priceToY(selectedSymbol.last)} 
                          stroke={selectedSymbol.changePercent >= 0 ? theme.chart.up : theme.chart.down} 
                          strokeWidth="1"
                          strokeDasharray="4,2"
                        />

                        {/* Current Price Box */}
                        <rect 
                          x={chartWidth - 68} 
                          y={priceToY(selectedSymbol.last) - 12} 
                          width="66" 
                          height="24" 
                          fill={selectedSymbol.changePercent >= 0 ? theme.chart.up : theme.chart.down} 
                          rx="3"
                        />
                        <text 
                          x={chartWidth - 65} 
                          y={priceToY(selectedSymbol.last) + 5} 
                          fill="white" 
                          fontSize="11" 
                          fontFamily="monospace"
                          fontWeight="600"
                        >{formatPrice(selectedSymbol.last)}</text>
                      </svg>
                    );
                  })()}

                  {/* Price Scale */}
                  <div className="price-scale">
                    {(() => {
                      const visibleCandles = ohlcData.slice(-50);
                      if (visibleCandles.length === 0) return null;
                      const allPrices = visibleCandles.flatMap(c => [c.h, c.l]);
                      const minPrice = Math.min(...allPrices);
                      const maxPrice = Math.max(...allPrices);
                      const range = maxPrice - minPrice;
                      const padding = range * 0.1;
                      const levels = [];
                      for (let i = 0; i <= 8; i++) {
                        levels.push(maxPrice + padding - (range + padding * 2) * i / 8);
                      }
                      return levels.map((p, i) => (
                        <div key={i} className="price-level">{formatPrice(p)}</div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Volume Chart */}
                <div className="volume-chart">
                  <div className="indicator-label">Vol <span className="value">30.831K</span></div>
                  <svg viewBox="0 0 800 50" preserveAspectRatio="none">
                    {ohlcData.slice(-80).map((d, i) => {
                      const isUp = d.c >= d.o;
                      return (
                        <rect 
                          key={i} 
                          x={i * 10} 
                          y={50 - d.v} 
                          width="6" 
                          height={d.v}
                          fill={isUp ? theme.chart.up : theme.chart.down}
                          opacity="0.7"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* MACD Chart */}
                <div className="macd-chart">
                  <div className="indicator-label">
                    MACD 12 26 close 9 EMA EMA 
                    <span className="macd-val">-0.00090</span>
                    <span className="signal-val">-0.00591</span>
                    <span className="hist-val">-0.00501</span>
                  </div>
                  <svg viewBox="0 0 800 60" preserveAspectRatio="none">
                    {/* Zero Line */}
                    <line x1="0" y1="30" x2="800" y2="30" stroke={theme.chart.grid} strokeWidth="0.5"/>
                    
                    {/* Histogram */}
                    {macdData.slice(-80).map((d, i) => (
                      <rect 
                        key={i}
                        x={i * 10}
                        y={d.hist >= 0 ? 30 - d.hist * 2000 : 30}
                        width="6"
                        height={Math.abs(d.hist) * 2000}
                        fill={d.hist >= 0 ? theme.chart.up : theme.chart.down}
                      />
                    ))}
                    
                    {/* MACD Line */}
                    <path 
                      d={`M ${macdData.slice(-80).map((d, i) => `${i * 10 + 3},${30 - d.macd * 2000}`).join(' L ')}`}
                      fill="none" stroke={theme.chart.macd} strokeWidth="1.5"
                    />
                    
                    {/* Signal Line */}
                    <path 
                      d={`M ${macdData.slice(-80).map((d, i) => `${i * 10 + 3},${30 - d.signal * 2000}`).join(' L ')}`}
                      fill="none" stroke={theme.chart.signal} strokeWidth="1.5"
                    />
                  </svg>
                </div>

                {/* RSI Chart */}
                <div className="rsi-chart">
                  <div className="indicator-label">RSI 14 close <span className="rsi-val">{rsiData.length > 0 ? rsiData[rsiData.length - 1].toFixed(2) : '50.00'}</span></div>
                  <svg viewBox="0 0 800 60" preserveAspectRatio="none">
                    {/* Overbought/Oversold zones */}
                    <rect x="0" y="0" width="800" height="12" fill={theme.chart.down} opacity="0.1"/>
                    <rect x="0" y="48" width="800" height="12" fill={theme.chart.up} opacity="0.1"/>
                    <line x1="0" y1="12" x2="800" y2="12" stroke={theme.chart.down} strokeWidth="0.5" strokeDasharray="4,4"/>
                    <line x1="0" y1="48" x2="800" y2="48" stroke={theme.chart.up} strokeWidth="0.5" strokeDasharray="4,4"/>
                    <line x1="0" y1="30" x2="800" y2="30" stroke={theme.chart.grid} strokeWidth="0.5"/>
                    
                    {/* RSI Line */}
                    <path 
                      d={`M ${rsiData.slice(-80).map((r, i) => `${i * 10 + 3},${60 - r * 0.6}`).join(' L ')}`}
                      fill="none" stroke={theme.accent.purple} strokeWidth="1.5"
                    />

                    {/* RSI Scale */}
                    <text x="790" y="15" fill={theme.text.muted} fontSize="8" textAnchor="end">80</text>
                    <text x="790" y="52" fill={theme.text.muted} fontSize="8" textAnchor="end">20</text>
                  </svg>
                </div>

                {/* Stochastic Oscillator */}
                {showStochastic && stochasticData.length > 0 && (
                  <div className="stochastic-chart">
                    <div className="indicator-label">
                      Stochastic 14,3,3 
                      <span className="stoch-k">%K {stochasticData[stochasticData.length - 1]?.k.toFixed(2)}</span>
                      <span className="stoch-d">%D {stochasticData[stochasticData.length - 1]?.d.toFixed(2)}</span>
                    </div>
                    <svg viewBox="0 0 800 60" preserveAspectRatio="none">
                      {/* Overbought/Oversold zones */}
                      <rect x="0" y="0" width="800" height="12" fill={theme.chart.down} opacity="0.1"/>
                      <rect x="0" y="48" width="800" height="12" fill={theme.chart.up} opacity="0.1"/>
                      <line x1="0" y1="12" x2="800" y2="12" stroke={theme.chart.down} strokeWidth="0.5" strokeDasharray="4,4"/>
                      <line x1="0" y1="48" x2="800" y2="48" stroke={theme.chart.up} strokeWidth="0.5" strokeDasharray="4,4"/>
                      
                      {/* %K Line */}
                      <path 
                        d={`M ${stochasticData.slice(-80).map((s, i) => `${i * 10 + 3},${60 - s.k * 0.6}`).join(' L ')}`}
                        fill="none" stroke={theme.accent.cyan} strokeWidth="1.5"
                      />
                      {/* %D Line */}
                      <path 
                        d={`M ${stochasticData.slice(-80).map((s, i) => `${i * 10 + 3},${60 - s.d * 0.6}`).join(' L ')}`}
                        fill="none" stroke={theme.accent.orange} strokeWidth="1.5" strokeDasharray="3,2"
                      />

                      <text x="790" y="15" fill={theme.text.muted} fontSize="8" textAnchor="end">80</text>
                      <text x="790" y="52" fill={theme.text.muted} fontSize="8" textAnchor="end">20</text>
                    </svg>
                  </div>
                )}

                {/* Time Scale */}
                <div className="time-scale">
                  {['2021', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((t, i) => (
                    <span key={i}>{t}</span>
                  ))}
                </div>
              </div>

              {/* DOM Ladder (Depth of Market) */}
              <div className="dom-ladder">
                <div className="dom-header">
                  <span>Price</span>
                </div>
                <div className="dom-body">
                  {domLadder.map((level, i) => {
                    const isCurrentPrice = Math.abs(level.price - selectedSymbol.last) < 0.00005;
                    return (
                      <div key={i} className={`dom-row ${isCurrentPrice ? 'current' : ''} ${level.ask > 0 ? 'ask-side' : 'bid-side'}`}>
                        <div className="dom-ask-vol">{level.ask > 0 ? level.ask : ''}</div>
                        <div className={`dom-price ${isCurrentPrice ? 'highlight' : ''}`}>
                          {formatPrice(level.price)}
                        </div>
                        <div className="dom-bid-vol">{level.bid > 0 ? level.bid : ''}</div>
                        {level.ask > 0 && <div className="dom-ask-bar" style={{width: `${level.ask / 5}%`}}/>}
                        {level.bid > 0 && <div className="dom-bid-bar" style={{width: `${level.bid / 5}%`}}/>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel */}
              <div className="right-panel">
                {/* Watchlist */}
                <div className="watchlist-panel">
                  <div className="panel-header">
                    <span className="panel-title">Green list</span>
                    <div className="panel-actions">
                      <button title="Add to watchlist"><Plus size={12} /></button>
                      <button title="Watchlist settings"><Settings size={12} /></button>
                    </div>
                  </div>
                  <div className="watchlist-header">
                    <span>Symbol</span>
                    <span>Last</span>
                    <span>Chg</span>
                    <span>Chg%</span>
                  </div>
                  <div className="watchlist-body">
                    {watchlist.map((item, i) => (
                      <div 
                        key={i} 
                        className={`watchlist-row ${item.symbol === selectedSymbol.symbol ? 'active' : ''}`}
                        onClick={() => setSelectedSymbol(item)}
                      >
                        <span className="symbol">
                          <Eye size={10} className={item.symbol === selectedSymbol.symbol ? 'visible' : ''}/>
                          {item.symbol}
                        </span>
                        <span className={`last ${item.changePercent >= 0 ? 'up' : 'down'}`}>
                          {formatPrice(item.last)}
                        </span>
                        <span className={`chg ${item.changePercent >= 0 ? 'up' : 'down'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(5)}
                        </span>
                        <span className={`chg-pct ${item.changePercent >= 0 ? 'up' : 'down'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Symbol Info */}
                <div className="symbol-info-panel">
                  <div className="symbol-header">
                    <div className="symbol-icon">
                      <Globe size={20} />
                    </div>
                    <div className="symbol-details">
                      <span className="symbol-name">{selectedSymbol.symbol}</span>
                      <span className="symbol-desc">Euro / U.S. Dollar • FxDefi</span>
                      <span className="symbol-type">Forex Major: Global</span>
                    </div>
                  </div>
                  <div className="current-price-display">
                    <span className="big-price">{formatPrice(selectedSymbol.last).split('.')[0]}.<span className="decimal">{formatPrice(selectedSymbol.last).split('.')[1]?.slice(0,2)}</span><span className="small">{formatPrice(selectedSymbol.last).split('.')[1]?.slice(2)}</span></span>
                    <span className="price-suffix">USD</span>
                  </div>
                  <div className={`price-change ${selectedSymbol.changePercent >= 0 ? 'up' : 'down'}`}>
                    {selectedSymbol.change >= 0 ? '+' : ''}{selectedSymbol.change.toFixed(5)} ({selectedSymbol.changePercent >= 0 ? '+' : ''}{selectedSymbol.changePercent.toFixed(2)}%)
                  </div>
                  <div className="market-status-badge">● MARKET OPEN</div>
                  
                  <div className="bid-ask-display">
                    <div className="bid-box">
                      <span className="label">BID</span>
                      <span className="value">{formatPrice(selectedSymbol.bid)}</span>
                    </div>
                    <div className="ask-box">
                      <span className="label">ASK</span>
                      <span className="value">{formatPrice(selectedSymbol.ask)}</span>
                    </div>
                  </div>

                  <div className="range-display">
                    <div className="range-row">
                      <span className="label">DAY'S RANGE</span>
                      <span className="value">{formatPrice(selectedSymbol.last * 0.998)} - {formatPrice(selectedSymbol.last * 1.002)}</span>
                    </div>
                    <div className="range-bar">
                      <div className="range-fill" style={{left: '30%', width: '40%'}}/>
                      <div className="range-marker" style={{left: '50%'}}/>
                    </div>
                    <div className="range-row">
                      <span className="label">52WK RANGE</span>
                      <span className="value">{formatPrice(selectedSymbol.last * 0.95)} - {formatPrice(selectedSymbol.last * 1.05)}</span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="performance-panel">
                  <div className="panel-header">
                    <span className="panel-title">Performance</span>
                  </div>
                  <div className="performance-grid">
                    <div className="perf-item down"><span className="period">1W</span><span className="value">-0.45%</span></div>
                    <div className="perf-item down"><span className="period">1M</span><span className="value">-2.08%</span></div>
                    <div className="perf-item down"><span className="period">3M</span><span className="value">-1.78%</span></div>
                    <div className="perf-item down"><span className="period">6M</span><span className="value">-3.44%</span></div>
                    <div className="perf-item down"><span className="period">YTD</span><span className="value">-5.30%</span></div>
                    <div className="perf-item down"><span className="period">1Y</span><span className="value">-2.08%</span></div>
                  </div>
                </div>

                {/* Technicals Gauge */}
                <div className="technicals-panel">
                  <div className="panel-header">
                    <span className="panel-title">Technicals</span>
                  </div>
                  <div className="gauge-container">
                    <svg viewBox="0 0 200 120" className="gauge-svg">
                      {/* Gauge background */}
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={theme.bg.tertiary} strokeWidth="12" strokeLinecap="round"/>
                      
                      {/* Colored sections */}
                      <path d="M 20 100 A 80 80 0 0 1 60 40" fill="none" stroke={theme.chart.down} strokeWidth="12" strokeLinecap="round"/>
                      <path d="M 60 40 A 80 80 0 0 1 100 25" fill="none" stroke={theme.chart.downLight} strokeWidth="12" strokeLinecap="round"/>
                      <path d="M 100 25 A 80 80 0 0 1 140 40" fill="none" stroke={theme.text.muted} strokeWidth="12" strokeLinecap="round"/>
                      <path d="M 140 40 A 80 80 0 0 1 180 100" fill="none" stroke={theme.chart.up} strokeWidth="12" strokeLinecap="round"/>
                      
                      {/* Needle */}
                      <line x1="100" y1="100" x2="100" y2="45" stroke={theme.text.primary} strokeWidth="3" strokeLinecap="round"/>
                      <circle cx="100" cy="100" r="8" fill={theme.text.primary}/>
                      
                      {/* Labels */}
                      <text x="25" y="115" fill={theme.text.secondary} fontSize="8">STRONG SELL</text>
                      <text x="55" y="35" fill={theme.text.secondary} fontSize="8">SELL</text>
                      <text x="90" y="18" fill={theme.text.primary} fontSize="9" fontWeight="600">NEUTRAL</text>
                      <text x="145" y="35" fill={theme.text.secondary} fontSize="8">BUY</text>
                      <text x="145" y="115" fill={theme.text.secondary} fontSize="8">STRONG BUY</text>
                    </svg>
                  </div>
                </div>

                {/* Trade Panel */}
                <div className="trade-panel">
                  <div className="order-controls">
                    <button className="flatten-btn">Flatten</button>
                    <button className="cxl-btn">CXL All</button>
                    <button className="reverse-btn">Reverse</button>
                  </div>
                  <div className="order-amount">
                    <button className="amt-btn" onClick={() => setOrderAmount(String(Math.max(1, parseInt(orderAmount) - 100)))} title="Decrease amount">-</button>
                    <input 
                      type="text" 
                      value={orderAmount} 
                      onChange={(e) => setOrderAmount(e.target.value.replace(/\D/g, ''))}
                      aria-label="Order amount"
                      title="Order amount"
                    />
                    <button className="amt-btn" onClick={() => setOrderAmount(String(parseInt(orderAmount) + 100))} title="Increase amount">+</button>
                    <select className="unit-select" title="Order unit type" aria-label="Order unit type">
                      <option>Units</option>
                      <option>Lots</option>
                    </select>
                  </div>
                  <div className="order-buttons">
                    <button className="buy-mkt-btn">
                      <span className="btn-label">Buy Mkt</span>
                    </button>
                    <button className="sell-mkt-btn">
                      <span className="btn-label">Sell Mkt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Bottom Panel - Positions/Orders/Alerts/News */}
            <div className="platform-bottombar enhanced">
              <div className="bottom-tabs">
                <button 
                  className={activeBottomTab === 'positions' ? 'active' : ''}
                  onClick={() => setActiveBottomTab('positions')}
                >
                  <Layers size={12} /> {language === 'es' ? 'Posiciones' : 'Positions'} 
                  {openPositions.length > 0 && <span className="tab-badge">{openPositions.length}</span>}
                </button>
                <button 
                  className={activeBottomTab === 'orders' ? 'active' : ''}
                  onClick={() => setActiveBottomTab('orders')}
                >
                  <Clock size={12} /> {language === 'es' ? 'Órdenes' : 'Orders'}
                  {pendingOrders.length > 0 && <span className="tab-badge">{pendingOrders.length}</span>}
                </button>
                <button 
                  className={activeBottomTab === 'alerts' ? 'active' : ''}
                  onClick={() => setActiveBottomTab('alerts')}
                >
                  <Bell size={12} /> {language === 'es' ? 'Alertas' : 'Alerts'}
                  {priceAlerts.filter(a => a.active).length > 0 && <span className="tab-badge alert">{priceAlerts.filter(a => a.active).length}</span>}
                </button>
                <button 
                  className={activeBottomTab === 'news' ? 'active' : ''}
                  onClick={() => setActiveBottomTab('news')}
                >
                  <FileText size={12} /> {language === 'es' ? 'Noticias' : 'News'}
                </button>
              </div>
              
              <div className="bottom-panel-content">
                {/* Positions Tab */}
                {activeBottomTab === 'positions' && (
                  <div className="positions-table">
                    <div className="table-header">
                      <span>{language === 'es' ? 'Símbolo' : 'Symbol'}</span>
                      <span>{language === 'es' ? 'Lado' : 'Side'}</span>
                      <span>{language === 'es' ? 'Tamaño' : 'Size'}</span>
                      <span>{language === 'es' ? 'Entrada' : 'Entry'}</span>
                      <span>{language === 'es' ? 'Actual' : 'Current'}</span>
                      <span>P&L</span>
                      <span>P&L %</span>
                      <span>Lev</span>
                      <span>{language === 'es' ? 'Liquidación' : 'Liq. Price'}</span>
                    </div>
                    {openPositions.map(pos => (
                      <div key={pos.id} className={`table-row ${pos.pnl >= 0 ? 'profit' : 'loss'}`}>
                        <span className="symbol-cell">{pos.symbol}</span>
                        <span className={`side-cell ${pos.side.toLowerCase()}`}>{pos.side}</span>
                        <span>${pos.size.toLocaleString()}</span>
                        <span className="mono">{pos.entryPrice.toFixed(5)}</span>
                        <span className="mono">{pos.currentPrice.toFixed(5)}</span>
                        <span className={`pnl-cell ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </span>
                        <span className={`pnl-cell ${pos.pnlPercent >= 0 ? 'positive' : 'negative'}`}>
                          {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                        </span>
                        <span className="leverage-cell">{pos.leverage}x</span>
                        <span className="liq-cell">{pos.liquidation.toFixed(4)}</span>
                      </div>
                    ))}
                    {openPositions.length === 0 && (
                      <div className="empty-state">{language === 'es' ? 'Sin posiciones abiertas' : 'No open positions'}</div>
                    )}
                  </div>
                )}
                
                {/* Orders Tab */}
                {activeBottomTab === 'orders' && (
                  <div className="orders-table">
                    <div className="table-header">
                      <span>ID</span>
                      <span>{language === 'es' ? 'Símbolo' : 'Symbol'}</span>
                      <span>{language === 'es' ? 'Tipo' : 'Type'}</span>
                      <span>{language === 'es' ? 'Lado' : 'Side'}</span>
                      <span>{language === 'es' ? 'Precio' : 'Price'}</span>
                      <span>{language === 'es' ? 'Tamaño' : 'Size'}</span>
                      <span>{language === 'es' ? 'Estado' : 'Status'}</span>
                      <span></span>
                    </div>
                    {pendingOrders.map(order => (
                      <div key={order.id} className="table-row">
                        <span className="order-id">#{order.id}</span>
                        <span className="symbol-cell">{order.symbol}</span>
                        <span className="type-cell">{order.type}</span>
                        <span className={`side-cell ${order.side.toLowerCase()}`}>{order.side}</span>
                        <span className="mono">{order.price.toFixed(5)}</span>
                        <span>${order.size.toLocaleString()}</span>
                        <span className={`status-cell ${order.status.toLowerCase()}`}>{order.status}</span>
                        <span>
                          <button className="cancel-btn" title={language === 'es' ? 'Cancelar' : 'Cancel'}>
                            <X size={12} />
                          </button>
                        </span>
                      </div>
                    ))}
                    {pendingOrders.length === 0 && (
                      <div className="empty-state">{language === 'es' ? 'Sin órdenes pendientes' : 'No pending orders'}</div>
                    )}
                  </div>
                )}
                
                {/* Alerts Tab */}
                {activeBottomTab === 'alerts' && (
                  <div className="alerts-panel">
                    <div className="alerts-header">
                      <button className="add-alert-btn" onClick={() => setShowAlertModal(true)}>
                        <Plus size={12} /> {language === 'es' ? 'Nueva Alerta' : 'New Alert'}
                      </button>
                    </div>
                    <div className="alerts-list">
                      {priceAlerts.map(alert => (
                        <div key={alert.id} className={`alert-item ${alert.triggered ? 'triggered' : ''} ${!alert.active ? 'inactive' : ''}`}>
                          <Bell size={14} className={alert.triggered ? 'triggered' : ''} />
                          <span className="alert-symbol">{alert.symbol}</span>
                          <span className="alert-condition">
                            {alert.condition === 'above' ? '↑ Above' : '↓ Below'}
                          </span>
                          <span className="alert-price">{alert.price.toFixed(2)}</span>
                          <span className={`alert-status ${alert.triggered ? 'triggered' : alert.active ? 'active' : 'inactive'}`}>
                            {alert.triggered ? '✓ Triggered' : alert.active ? 'Active' : 'Inactive'}
                          </span>
                          <button className="delete-alert-btn" onClick={() => setPriceAlerts(prev => prev.filter(a => a.id !== alert.id))} title="Delete alert" aria-label="Delete alert">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* News Tab */}
                {activeBottomTab === 'news' && (
                  <div className="news-panel">
                    {marketNews.map(news => (
                      <div key={news.id} className={`news-item impact-${news.impact}`}>
                        <div className={`news-impact ${news.impact}`}>
                          {news.impact === 'high' ? '🔴' : news.impact === 'medium' ? '🟡' : '🟢'}
                        </div>
                        <div className="news-content">
                          <span className="news-title">{news.title}</span>
                          <div className="news-meta">
                            <span className="news-source">{news.source}</span>
                            <span className="news-time">{news.time}</span>
                            {news.symbol && <span className="news-symbol">{news.symbol}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Price Alert Modal */}
            {showAlertModal && (
              <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
                <div className="alert-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <Bell size={18} />
                    <span>{language === 'es' ? 'Crear Alerta de Precio' : 'Create Price Alert'}</span>
                    <button onClick={() => setShowAlertModal(false)}><X size={18} /></button>
                  </div>
                  <div className="modal-body">
                    <div className="modal-field">
                      <label>{language === 'es' ? 'Símbolo' : 'Symbol'}</label>
                      <span className="field-value">{selectedSymbol.symbol}</span>
                    </div>
                    <div className="modal-field">
                      <label>{language === 'es' ? 'Precio Actual' : 'Current Price'}</label>
                      <span className="field-value">{formatPrice(selectedSymbol.last)}</span>
                    </div>
                    <div className="modal-field">
                      <label>{language === 'es' ? 'Condición' : 'Condition'}</label>
                      <div className="condition-btns">
                        <button 
                          className={newAlertCondition === 'above' ? 'active' : ''}
                          onClick={() => setNewAlertCondition('above')}
                        >↑ {language === 'es' ? 'Por encima' : 'Above'}</button>
                        <button 
                          className={newAlertCondition === 'below' ? 'active' : ''}
                          onClick={() => setNewAlertCondition('below')}
                        >↓ {language === 'es' ? 'Por debajo' : 'Below'}</button>
                      </div>
                    </div>
                    <div className="modal-field">
                      <label>{language === 'es' ? 'Precio de Alerta' : 'Alert Price'}</label>
                      <input 
                        type="text" 
                        value={newAlertPrice}
                        onChange={e => setNewAlertPrice(e.target.value)}
                        placeholder={formatPrice(selectedSymbol.last)}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-modal-btn" onClick={() => setShowAlertModal(false)}>
                      {language === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button 
                      className="create-alert-btn"
                      onClick={() => {
                        const price = parseFloat(newAlertPrice);
                        if (!isNaN(price)) {
                          setPriceAlerts(prev => [...prev, {
                            id: Date.now(),
                            symbol: selectedSymbol.symbol,
                            condition: newAlertCondition,
                            price,
                            active: true,
                            triggered: false
                          }]);
                          setShowAlertModal(false);
                          setNewAlertPrice('');
                          addToast('success', language === 'es' ? 'Alerta Creada' : 'Alert Created', 
                            `${selectedSymbol.symbol} ${newAlertCondition} ${price}`);
                        }
                      }}
                    >
                      <Bell size={14} /> {language === 'es' ? 'Crear Alerta' : 'Create Alert'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            {/* AI TRADING CHATBOT - FxDefi AI with LIVE PROFIT SIMULATION */}
            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            <div className="ai-chatbot-container">
              <div className="chatbot-header">
                <div className="chatbot-title">
                  <div className="ai-avatar pulse-glow">
                    <Brain size={18} />
                  </div>
                  <div className="title-info">
                    <span className="title">FxDefi AI</span>
                    <span className="subtitle">{language === 'es' ? 'Trading Automático con IA' : 'AI Auto-Trading Bot'}</span>
                  </div>
                </div>
                <div className="chatbot-status">
                  <div className={`auto-trading-toggle ${autoTradingEnabled ? 'active' : ''}`}>
                    <button 
                      onClick={() => {
                        setAutoTradingEnabled(!autoTradingEnabled);
                        if (!autoTradingEnabled) {
                          addToast('success', language === 'es' ? 'AI Activado' : 'AI Activated', 
                            language === 'es' ? 'El bot de trading está operando' : 'Trading bot is now active');
                        }
                      }}
                      title={autoTradingEnabled ? 'Disable Auto-Trading' : 'Enable Auto-Trading'}
                    >
                      {autoTradingEnabled ? <StopCircle size={14} /> : <Bot size={14} />}
                      <span>{autoTradingEnabled ? 'Auto: ON' : 'Auto: OFF'}</span>
                    </button>
                  </div>
                  <div className="ai-confidence">
                    <Sparkle size={12} />
                    <span>{aiWinRate.toFixed(1)}% Win Rate</span>
                  </div>
                </div>
              </div>

              {/* AI PROFIT DASHBOARD - Shows live trading performance */}
              {autoTradingEnabled && (
                <div className="ai-profit-dashboard">
                  <div className="profit-stats-row">
                    <div className="profit-stat total-profit">
                      <DollarSign size={16} />
                      <div className="stat-info">
                        <span className="stat-label">{language === 'es' ? 'Ganancia Total' : 'Total Profit'}</span>
                        <span className={`stat-value ${aiTotalProfit >= 0 ? 'positive' : 'negative'}`}>
                          {aiTotalProfit >= 0 ? '+' : ''}${aiTotalProfit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="profit-stat daily-pnl">
                      <TrendingUp size={16} />
                      <div className="stat-info">
                        <span className="stat-label">{language === 'es' ? 'P&L Hoy' : "Today's P&L"}</span>
                        <span className={`stat-value ${aiDailyPnL >= 0 ? 'positive' : 'negative'}`}>
                          {aiDailyPnL >= 0 ? '+' : ''}${aiDailyPnL.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="profit-stat trades-count">
                      <Target size={16} />
                      <div className="stat-info">
                        <span className="stat-label">{language === 'es' ? 'Trades' : 'Trades'}</span>
                        <span className="stat-value">{aiTotalTrades}</span>
                      </div>
                    </div>
                    <div className="profit-stat win-rate">
                      <Award size={16} />
                      <div className="stat-info">
                        <span className="stat-label">{language === 'es' ? 'Win Rate' : 'Win Rate'}</span>
                        <span className="stat-value positive">{aiWinRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Trades */}
                  {aiActiveTrades.length > 0 && (
                    <div className="active-trades-panel">
                      <div className="trades-header">
                        <Activity size={14} />
                        <span>{language === 'es' ? 'Trades Activos' : 'Active Trades'} ({aiActiveTrades.length})</span>
                      </div>
                      <div className="trades-list">
                        {aiActiveTrades.map(trade => (
                          <div key={trade.id} className={`trade-item ${trade.profit >= 0 ? 'profit' : 'loss'}`}>
                            <div className="trade-pair">
                              <span className={`direction-badge ${trade.direction.toLowerCase()}`}>
                                {trade.direction === 'LONG' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                                {trade.direction}
                              </span>
                              <span className="pair-name">{trade.pair}</span>
                            </div>
                            <div className="trade-details">
                              <span className="entry">{language === 'es' ? 'Entrada' : 'Entry'}: {trade.entry.toFixed(5)}</span>
                              <span className="size">${trade.size.toLocaleString()}</span>
                            </div>
                            <div className={`trade-pnl ${trade.profit >= 0 ? 'positive' : 'negative'}`}>
                              {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                              <div className="pnl-bar">
                                <div className="pnl-fill" style={{
                                  width: `${Math.min(100, Math.abs(trade.profit) * 2)}%`,
                                  background: trade.profit >= 0 ? '#22c55e' : '#ef4444'
                                }}/>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Closed Trades */}
                  {aiClosedTrades.length > 0 && (
                    <div className="closed-trades-panel">
                      <div className="trades-header">
                        <CheckCircle size={14} />
                        <span>{language === 'es' ? 'Trades Cerrados Recientes' : 'Recent Closed Trades'}</span>
                      </div>
                      <div className="closed-trades-list">
                        {aiClosedTrades.slice(0, 5).map(trade => (
                          <div key={trade.id} className={`closed-trade-item ${trade.result.toLowerCase()}`}>
                            <span className={`result-badge ${trade.result.toLowerCase()}`}>
                              {trade.result === 'WIN' ? '✓' : '✗'}
                            </span>
                            <span className="pair">{trade.pair}</span>
                            <span className={`pnl ${trade.pnl >= 0 ? 'positive' : 'negative'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI Predictions Bar */}
              <div className="ai-predictions-bar">
                <span className="predictions-label"><TrendingUp size={12} /> {language === 'es' ? 'Predicciones en Vivo' : 'Live Predictions'}:</span>
                <div className="predictions-scroll">
                  {aiPredictions.map((pred, i) => (
                    <div key={i} className={`prediction-chip ${pred.direction}`}>
                      <span className="pair">{pred.pair}</span>
                      <span className={`direction ${pred.direction}`}>
                        {pred.direction === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {pred.direction.toUpperCase()}
                      </span>
                      <span className="confidence">{pred.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="chatbot-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.role} ${msg.type || ''}`}>
                    {msg.role === 'ai' && (
                      <div className="message-avatar">
                        <Brain size={14} />
                      </div>
                    )}
                    <div className="message-content">
                      <div className="message-text" dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }} />
                      <span className="message-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="chat-message ai typing">
                    <div className="message-avatar"><Brain size={14} /></div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="chatbot-input">
                <div className="quick-actions">
                  <button onClick={() => setChatInput('prediction')} title="Get Prediction">
                    <BarChart3 size={14} /> Predict
                  </button>
                  <button onClick={() => setChatInput('signal')} title="Get Signal">
                    <Zap size={14} /> Signal
                  </button>
                  <button onClick={() => setChatInput('auto trading status')} title="Auto-Trading">
                    <Bot size={14} /> Bot
                  </button>
                </div>
                <div className="input-row">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder={language === 'es' ? 'Pregunta al AI sobre predicciones, señales o auto-trading...' : 'Ask AI about predictions, signals, or auto-trading...'}
                    aria-label="Chat input"
                  />
                  <button 
                    className="send-btn" 
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isAiTyping}
                    title="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Currencies Section */}
        <section id="currencies" className="section">
          <div className="section-header">
            <div className="section-icon"><Wallet size={24} /></div>
            <div>
              <h2>15 {t.forexPairs}</h2>
              <p>{t.forexPairsDesc}</p>
            </div>
          </div>
          <div className="currencies-grid">
            {CURRENCIES.map((curr, i) => (
              <div key={i} className="currency-card">
                <span className="flag">{curr.flag}</span>
                <div className="info">
                  <span className="code">{curr.vCode}</span>
                  <span className="name">{curr.name}</span>
                </div>
                <div className="rate">
                  <span className="value">{curr.rate.toFixed(curr.rate > 10 ? 2 : 4)}</span>
                  <span className="label">/VUSD</span>
                </div>
                <span className="verified"><CheckCircle size={12} />{t.verified}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Commodities Section */}
        <section id="commodities" className="section dark">
          <div className="section-header">
            <div className="section-icon gold"><Gem size={24} /></div>
            <div>
              <h2>{t.commoditiesTitle}</h2>
              <p>{t.commoditiesDesc}</p>
            </div>
          </div>
          {Object.entries(commoditiesByCategory).map(([category, items]) => (
            <div key={category} className="commodity-category">
              <h3>
                {category === 'Precious Metals' && <Gem size={16} />}
                {category === 'Energy' && <Fuel size={16} />}
                {category === 'Agriculture' && <Wheat size={16} />}
                {category === 'Industrial' && <Layers size={16} />}
                {t[category.replace(' ', '').toLowerCase() as keyof typeof t] || category}
              </h3>
              <div className="commodities-grid">
                {items.map((item, i) => {
                  const IconComponent = CommodityIcons[item.vCode];
                  return (
                    <div key={i} className="commodity-card">
                      <div className="commodity-icon-wrapper">
                        {IconComponent ? <IconComponent size={32} /> : <Gem size={32} />}
                      </div>
                      <div className="info">
                        <div className="header">
                          <span className="code">{item.vCode}</span>
                          <span className={`change ${item.change >= 0 ? 'up' : 'down'}`}>
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                          </span>
                        </div>
                        <span className="name">{item.name}</span>
                        <div className="price">
                          <span className="value">${item.price.toFixed(2)}</span>
                          <span className="unit">/{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Features Section */}
        <section id="features" className="section">
          <div className="section-header">
            <div className="section-icon"><Layers size={24} /></div>
            <div>
              <h2>{t.features}</h2>
              <p>{t.featuresDesc}</p>
            </div>
          </div>
          <div className="features-grid">
            {[
              { icon: <Database size={22} />, title: t.deepLiquidity, desc: t.deepLiquidityDesc, highlight: true },
              { icon: <Server size={22} />, title: t.oracleIntegration, desc: t.oracleIntegrationDesc, highlight: true },
              { icon: <Zap size={22} />, title: t.instantSettlement, desc: t.instantSettlementDesc },
              { icon: <Globe size={22} />, title: t.globalAccess, desc: t.globalAccessDesc },
              { icon: <Brain size={22} />, title: t.aiTrading, desc: t.aiTradingDesc, highlight: true },
              { icon: <TrendingUp size={22} />, title: t.leverage, desc: t.leverageDesc },
            ].map((f, i) => (
              <div key={i} className={`feature-card ${f.highlight ? 'highlight' : ''}`}>
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="section">
          <div className="section-header">
            <div className="section-icon"><Clock size={24} /></div>
            <div>
              <h2>{t.roadmap}</h2>
              <p>{t.roadmapDesc}</p>
            </div>
          </div>
          <div className="roadmap-grid">
            {[
              { phase: t.q1, title: t.testnet, items: ['Beta interface', 'Major forex pairs', 'Gold & Oil', 'Testnet mining'] },
              { phase: t.q2, title: t.mainnetAlpha, items: ['10 currencies', '8 commodities', 'Order books', '$100M TVL'] },
              { phase: t.q3, title: t.fullLaunch, items: ['All 15 currencies', 'All commodities', '100x leverage', 'AI signals'] },
              { phase: t.q4, title: t.expansion, items: ['Cross-chain', 'Institutional API', 'DAO governance', 'Mobile app'] },
            ].map((phase, i) => (
              <div key={i} className="roadmap-item">
                <div className="marker"><div className="dot" />{i < 3 && <div className="line" />}</div>
                <div className="content">
                  <span className="phase">{phase.phase}</span>
                  <h3>{phase.title}</h3>
                  <ul>{phase.items.map((item, j) => <li key={j}><ChevronRight size={12} />{item}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Partners & Audits Section */}
        <section className="partners-section">
          <div className="partners-header">
            <ShieldCheck size={24} />
            <h2>{language === 'es' ? 'Seguridad y Partners' : 'Security & Partners'}</h2>
          </div>
          <div className="partners-grid">
            <div className="partner-card glass-card">
              <div className="partner-icon audit"><Shield size={28} /></div>
              <span className="partner-name">Certik</span>
              <span className="partner-label">{language === 'es' ? 'Auditoría' : 'Audit'}</span>
            </div>
            <div className="partner-card glass-card">
              <div className="partner-icon audit"><ShieldCheck size={28} /></div>
              <span className="partner-name">Hacken</span>
              <span className="partner-label">{language === 'es' ? 'Auditoría' : 'Audit'}</span>
            </div>
            <div className="partner-card glass-card">
              <div className="partner-icon partner"><Globe size={28} /></div>
              <span className="partner-name">LemonChain</span>
              <span className="partner-label">Blockchain</span>
            </div>
            <div className="partner-card glass-card">
              <div className="partner-icon partner"><Database size={28} /></div>
              <span className="partner-name">Pyth Network</span>
              <span className="partner-label">{language === 'es' ? 'Precios' : 'Price Feeds'}</span>
            </div>
            <div className="partner-card glass-card">
              <div className="partner-icon partner"><Layers size={28} /></div>
              <span className="partner-name">AWS</span>
              <span className="partner-label">Infrastructure</span>
            </div>
            <div className="partner-card glass-card">
              <div className="partner-icon partner"><Coins size={28} /></div>
              <span className="partner-name">Fireblocks</span>
              <span className="partner-label">Custody</span>
            </div>
          </div>
          <div className="security-badges">
            <div className="security-badge">
              <CheckCircle size={16} />
              <span>{language === 'es' ? 'Smart Contracts Auditados' : 'Audited Smart Contracts'}</span>
            </div>
            <div className="security-badge">
              <Lock size={16} />
              <span>{language === 'es' ? 'Custodia Institucional' : 'Institutional Custody'}</span>
            </div>
            <div className="security-badge">
              <Shield size={16} />
              <span>{language === 'es' ? 'Seguro de $100M' : '$100M Insurance'}</span>
            </div>
          </div>
        </section>

        {/* CTA with Newsletter */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>{t.joinWaitlist}</h2>
            <p>{t.waitlistDesc}</p>
            
            {/* Newsletter Signup */}
            <div className="newsletter-form glass-card">
              {!emailSubmitted ? (
                <>
                  <div className="newsletter-icon"><Mail size={24} /></div>
                  <h3>{language === 'es' ? 'Únete a la Lista de Espera' : 'Join the Waitlist'}</h3>
                  <p>{language === 'es' ? 'Sé el primero en acceder cuando lancemos' : 'Be the first to access when we launch'}</p>
                  <div className="newsletter-input-group">
                    <input 
                      type="email" 
                      placeholder={language === 'es' ? 'Tu email...' : 'Enter your email...'} 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email for newsletter"
                    />
                    <button 
                      className="btn-subscribe"
                      onClick={() => {
                        if (email.includes('@')) {
                          setEmailSubmitted(true);
                          addToast('success', language === 'es' ? '¡Registrado!' : 'Subscribed!', 
                            language === 'es' ? 'Te notificaremos cuando lancemos' : "We'll notify you when we launch");
                        }
                      }}
                    >
                      {language === 'es' ? 'Registrarse' : 'Subscribe'}
                    </button>
                  </div>
                  <span className="newsletter-note">
                    <Lock size={12} /> {language === 'es' ? 'Sin spam. Solo actualizaciones importantes.' : 'No spam. Only important updates.'}
                  </span>
                </>
              ) : (
                <div className="newsletter-success">
                  <CheckCircle size={48} />
                  <h3>{language === 'es' ? '¡Gracias por registrarte!' : 'Thanks for subscribing!'}</h3>
                  <p>{language === 'es' ? 'Te contactaremos cuando FxDefi esté listo' : "We'll contact you when FxDefi is ready"}</p>
                </div>
              )}
            </div>

            <div className="cta-buttons">
              <a href="https://fxdefi.world" className="btn-primary btn-glow" target="_blank" rel="noopener noreferrer">
                <Globe size={16} />Visit FxDefi.world<ArrowUpRight size={14} />
              </a>
              <a href="/fxdefi/whitepaper" className="btn-secondary"><FileText size={16} />{t.readWhitepaper}</a>
            </div>
            <div className="powered-badge"><Sparkles size={14} />{t.poweredBy}</div>
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-icon"><TrendingUp size={20} /></div>
                <span className="logo-text">FxDefi<span className="logo-accent">.world</span></span>
              </div>
              <p>{t.subtitle}</p>
              {/* Social Links */}
              <div className="social-links">
                <a href="#" className="social-link" title="Twitter"><Twitter size={18} /></a>
                <a href="#" className="social-link" title="Discord"><MessageCircle size={18} /></a>
                <a href="#" className="social-link" title="Telegram"><Send size={18} /></a>
                <a href="#" className="social-link" title="GitHub"><Github size={18} /></a>
              </div>
            </div>
            <div className="footer-links">
              <div className="col">
                <h4>Protocol</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('whitepaper'); window.scrollTo(0, 0); }}>Whitepaper</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('documentation'); window.scrollTo(0, 0); }}>Documentation</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('smart-contracts'); window.scrollTo(0, 0); }}>Smart Contracts</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('audit-reports'); window.scrollTo(0, 0); }}>Audit Reports</a>
              </div>
              <div className="col">
                <h4>Resources</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('api-docs'); window.scrollTo(0, 0); }}>API Docs</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('trading-guide'); window.scrollTo(0, 0); }}>Trading Guide</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('faq'); window.scrollTo(0, 0); }}>FAQ</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('blog'); window.scrollTo(0, 0); }}>Blog</a>
              </div>
              <div className="col">
                <h4>Legal</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('terms'); window.scrollTo(0, 0); }}>Terms of Service</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('privacy'); window.scrollTo(0, 0); }}>Privacy Policy</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('risk-disclosure'); window.scrollTo(0, 0); }}>Risk Disclosure</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubpage('compliance'); window.scrollTo(0, 0); }}>Compliance</a>
              </div>
            </div>
          </div>
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="footer-stat-value">$2.4B+</span>
              <span className="footer-stat-label">{language === 'es' ? 'Volumen Proyectado' : 'Projected Volume'}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-stat-value">15K+</span>
              <span className="footer-stat-label">{language === 'es' ? 'En Lista de Espera' : 'On Waitlist'}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-stat-value">105+</span>
              <span className="footer-stat-label">{language === 'es' ? 'Pares de Trading' : 'Trading Pairs'}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-stat-value">Q1 2026</span>
              <span className="footer-stat-label">{language === 'es' ? 'Lanzamiento' : 'Launch'}</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 FxDefi. All rights reserved.</span>
            <span className="powered">{t.poweredBy}</span>
            <a href="/">{t.backToTreasury}</a>
          </div>
        </footer>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES - TREASURY MINTING DARK THEME WITH LEMON ACCENTS
// ═══════════════════════════════════════════════════════════════════════════════

const platformStyles = `
* { margin: 0; padding: 0; box-sizing: border-box; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  50% { transform: translateY(-100vh) rotate(360deg); opacity: 0.8; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes pulse-profit {
  0%, 100% { box-shadow: 0 0 5px ${theme.accent.green}40; }
  50% { box-shadow: 0 0 20px ${theme.accent.green}60; }
}

@keyframes glow-btn {
  0%, 100% { box-shadow: 0 0 20px ${theme.accent.lemon}40; }
  50% { box-shadow: 0 0 40px ${theme.accent.lemon}60; }
}

.spin { animation: spin 1s linear infinite; }

.platform-page {
  min-height: 100vh;
  background: ${theme.bg.primary};
  color: ${theme.text.primary};
  font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
  padding-top: 32px; /* Space for the fixed ticker */
}

.platform-bg {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at top, ${theme.bg.secondary} 0%, ${theme.bg.primary} 70%);
  pointer-events: none;
  overflow: hidden;
}

/* Floating Particles */
.particles { position: absolute; inset: 0; overflow: hidden; }
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: ${theme.accent.lemon};
  border-radius: 50%;
  bottom: -10px;
  animation: float 15s infinite;
  opacity: 0.3;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 130px; /* Below ticker + header */
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  animation: slideIn 0.3s ease-out;
  min-width: 280px;
}

.toast-success { border-color: ${theme.accent.green}50; }
.toast-error { border-color: ${theme.accent.red}50; }
.toast-info { border-color: ${theme.accent.blue}50; }
.toast-profit { 
  border-color: ${theme.accent.green}; 
  background: ${theme.accent.green}15;
  animation: slideIn 0.3s ease-out, pulse-profit 2s infinite;
}

.toast-icon { 
  width: 36px; 
  height: 36px; 
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-success .toast-icon { background: ${theme.accent.green}20; color: ${theme.accent.green}; }
.toast-error .toast-icon { background: ${theme.accent.red}20; color: ${theme.accent.red}; }
.toast-info .toast-icon { background: ${theme.accent.blue}20; color: ${theme.accent.blue}; }
.toast-profit .toast-icon { background: ${theme.accent.green}30; color: ${theme.accent.green}; }

.toast-content { flex: 1; }
.toast-title { font-size: 13px; font-weight: 700; color: ${theme.text.primary}; }
.toast-message { font-size: 12px; color: ${theme.text.secondary}; }
.toast-profit .toast-profit { font-size: 16px; font-weight: 800; color: ${theme.accent.green}; margin-top: 4px; }
.toast-close { 
  background: none; 
  border: none; 
  color: ${theme.text.muted}; 
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.toast-close:hover { background: ${theme.bg.hover}; color: ${theme.text.primary}; }

/* Live Market Ticker */
.live-ticker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: ${theme.bg.primary};
  border-bottom: 1px solid ${theme.border.primary};
  display: flex;
  align-items: center;
  z-index: 200;
  overflow: hidden;
}

.ticker-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: ${theme.accent.lemon};
  color: ${theme.bg.primary};
  font-size: 10px;
  font-weight: 800;
  height: 100%;
  flex-shrink: 0;
}

.ticker-track {
  flex: 1;
  overflow: hidden;
}

.ticker-content {
  display: flex;
  gap: 40px;
  animation: ticker 30s linear infinite;
  white-space: nowrap;
}

.ticker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.ticker-symbol { color: ${theme.text.primary}; font-weight: 600; }
.ticker-price { color: ${theme.text.secondary}; font-family: monospace; }
.ticker-change { font-weight: 600; }
.ticker-change.up { color: ${theme.chart.up}; }
.ticker-change.down { color: ${theme.chart.down}; }

/* Glass Card Effect */
.glass-card {
  background: ${theme.bg.secondary}90;
  backdrop-filter: blur(10px);
  border: 1px solid ${theme.border.lemon};
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${theme.accent.lemon}15;
  border-color: ${theme.accent.lemon}60;
}

/* Hero Animations */
.hero-section {
  padding: 80px 20px 60px;
  margin-top: 0;
}

.hero-section.visible .animate-item {
  animation: slideIn 0.6s ease-out forwards;
}

.animate-item {
  opacity: 0;
  transform: translateY(30px);
}

.delay-1 { animation-delay: 0.1s !important; }
.delay-2 { animation-delay: 0.2s !important; }
.delay-3 { animation-delay: 0.3s !important; }
.delay-4 { animation-delay: 0.4s !important; }
.delay-5 { animation-delay: 0.5s !important; }
.delay-6 { animation-delay: 0.6s !important; }

.btn-glow {
  animation: glow-btn 2s ease-in-out infinite;
}

.pulse-glow {
  animation: pulse-profit 2s infinite;
}

/* Market Overview Section */
.market-overview-section {
  padding: 40px 20px;
  max-width: 1800px;
  margin: 0 auto;
}

.market-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.sentiment-card {
  background: ${theme.bg.secondary};
  border-radius: 16px;
  padding: 20px;
}

.sentiment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 700;
  color: ${theme.text.primary};
}

.sentiment-header svg { color: ${theme.accent.lemon}; }

/* Fear & Greed Gauge */
.sentiment-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-arc {
  width: 160px;
  height: 80px;
}

.sentiment-value {
  font-size: 36px;
  font-weight: 800;
  color: ${theme.accent.lemon};
  margin-top: -10px;
}

.sentiment-label {
  font-size: 12px;
  color: ${theme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Sentiment Bars */
.sentiment-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.sentiment-bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 60px;
  font-size: 11px;
  color: ${theme.text.secondary};
}

.bar-track {
  flex: 1;
  height: 8px;
  background: ${theme.bg.tertiary};
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-fill.bullish { background: ${theme.chart.up}; }
.bar-fill.bearish { background: ${theme.chart.down}; }

.bar-value {
  width: 40px;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  color: ${theme.text.primary};
}

.sentiment-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${theme.text.secondary};
  padding-top: 10px;
  border-top: 1px solid ${theme.border.primary};
}

.sentiment-indicator strong.bullish { color: ${theme.chart.up}; }
.sentiment-indicator strong.bearish { color: ${theme.chart.down}; }

/* Top Movers */
.movers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mover-item {
  display: grid;
  grid-template-columns: 30px 1fr 70px 60px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: ${theme.bg.tertiary};
  border-radius: 8px;
  font-size: 12px;
}

.mover-rank { color: ${theme.text.muted}; font-weight: 600; }
.mover-symbol { color: ${theme.text.primary}; font-weight: 600; }
.mover-change { 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  font-weight: 700; 
}
.mover-change.up { color: ${theme.chart.up}; }
.mover-change.down { color: ${theme.chart.down}; }
.mover-volume { color: ${theme.text.muted}; text-align: right; }

/* Trading Stats Mini */
.stats-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-mini {
  text-align: center;
  padding: 12px;
  background: ${theme.bg.tertiary};
  border-radius: 8px;
}

.stat-mini-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: ${theme.accent.lemon};
}

.stat-mini-label {
  font-size: 10px;
  color: ${theme.text.muted};
  text-transform: uppercase;
}

/* AI Profit Dashboard */
.ai-profit-dashboard {
  background: linear-gradient(135deg, ${theme.accent.green}08, ${theme.bg.tertiary});
  border-bottom: 1px solid ${theme.accent.green}30;
  padding: 16px;
}

.profit-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.profit-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.primary};
  border-radius: 10px;
}

.profit-stat svg { color: ${theme.accent.lemon}; }

.profit-stat.total-profit { border-color: ${theme.accent.green}40; }
.profit-stat.daily-pnl { border-color: ${theme.accent.blue}40; }

.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 10px; color: ${theme.text.muted}; text-transform: uppercase; }
.stat-value { font-size: 16px; font-weight: 800; color: ${theme.text.primary}; }
.stat-value.positive { color: ${theme.accent.green}; }
.stat-value.negative { color: ${theme.accent.red}; }

/* Active Trades Panel */
.active-trades-panel, .closed-trades-panel {
  margin-top: 12px;
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.primary};
  border-radius: 10px;
  overflow: hidden;
}

.trades-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: ${theme.bg.tertiary};
  border-bottom: 1px solid ${theme.border.primary};
  font-size: 12px;
  font-weight: 600;
  color: ${theme.text.primary};
}

.trades-header svg { color: ${theme.accent.lemon}; }

.trades-list {
  max-height: 200px;
  overflow-y: auto;
}

.trade-item {
  display: grid;
  grid-template-columns: 120px 1fr 100px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid ${theme.border.primary};
}

.trade-item:last-child { border-bottom: none; }

.trade-item.profit { background: ${theme.accent.green}05; }
.trade-item.loss { background: ${theme.accent.red}05; }

.trade-pair {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.direction-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  width: fit-content;
}

.direction-badge.long { background: ${theme.chart.up}20; color: ${theme.chart.up}; }
.direction-badge.short { background: ${theme.chart.down}20; color: ${theme.chart.down}; }

.pair-name { font-size: 12px; font-weight: 600; color: ${theme.text.primary}; }

.trade-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: ${theme.text.muted};
}

.trade-pnl {
  text-align: right;
  font-size: 14px;
  font-weight: 700;
}

.trade-pnl.positive { color: ${theme.chart.up}; }
.trade-pnl.negative { color: ${theme.chart.down}; }

.pnl-bar {
  height: 3px;
  background: ${theme.bg.tertiary};
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.pnl-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Closed Trades */
.closed-trades-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.closed-trade-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${theme.bg.tertiary};
  border-radius: 6px;
  font-size: 12px;
}

.result-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

.result-badge.win { background: ${theme.chart.up}20; color: ${theme.chart.up}; }
.result-badge.loss { background: ${theme.chart.down}20; color: ${theme.chart.down}; }

.closed-trade-item .pair { flex: 1; color: ${theme.text.secondary}; }
.closed-trade-item .pnl { font-weight: 700; }
.closed-trade-item .pnl.positive { color: ${theme.chart.up}; }
.closed-trade-item .pnl.negative { color: ${theme.chart.down}; }

/* Partners Section */
.partners-section {
  padding: 60px 20px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.partners-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.partners-header svg { color: ${theme.accent.lemon}; }
.partners-header h2 { font-size: 28px; font-weight: 800; }

.partners-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

.partner-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  background: ${theme.bg.secondary};
  border-radius: 12px;
}

.partner-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.partner-icon.audit { background: ${theme.accent.green}15; color: ${theme.accent.green}; }
.partner-icon.partner { background: ${theme.accent.lemon}15; color: ${theme.accent.lemon}; }

.partner-name { font-size: 14px; font-weight: 700; color: ${theme.text.primary}; }
.partner-label { font-size: 11px; color: ${theme.text.muted}; }

.security-badges {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.security-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${theme.accent.green}10;
  border: 1px solid ${theme.accent.green}30;
  border-radius: 20px;
  font-size: 12px;
  color: ${theme.accent.green};
  font-weight: 600;
}

/* Newsletter Form */
.newsletter-form {
  max-width: 500px;
  margin: 0 auto 30px;
  padding: 30px;
  text-align: center;
  border-radius: 16px;
}

.newsletter-icon {
  width: 60px;
  height: 60px;
  background: ${theme.accent.lemon}15;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.accent.lemon};
  margin: 0 auto 16px;
}

.newsletter-form h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.newsletter-form p { font-size: 13px; color: ${theme.text.secondary}; margin-bottom: 20px; }

.newsletter-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.newsletter-input-group input {
  flex: 1;
  padding: 14px 18px;
  background: ${theme.bg.primary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 10px;
  color: ${theme.text.primary};
  font-size: 14px;
}

.newsletter-input-group input:focus {
  outline: none;
  border-color: ${theme.accent.lemon};
}

.btn-subscribe {
  padding: 14px 24px;
  background: ${theme.gradient.lemon};
  border: none;
  border-radius: 10px;
  color: ${theme.bg.primary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-subscribe:hover { transform: scale(1.05); }

.newsletter-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.text.muted};
}

.newsletter-success {
  padding: 20px;
}

.newsletter-success svg { color: ${theme.accent.green}; margin-bottom: 16px; }
.newsletter-success h3 { color: ${theme.accent.green}; margin-bottom: 8px; }

/* Social Links */
.social-links {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.social-link {
  width: 40px;
  height: 40px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.primary};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.text.secondary};
  transition: all 0.2s;
}

.social-link:hover {
  background: ${theme.accent.lemon}15;
  border-color: ${theme.accent.lemon};
  color: ${theme.accent.lemon};
}

/* Footer Stats */
.footer-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 30px 20px;
  border-top: 1px solid ${theme.border.primary};
  border-bottom: 1px solid ${theme.border.primary};
  margin: 30px 0;
}

.footer-stat {
  text-align: center;
}

.footer-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: ${theme.accent.lemon};
}

.footer-stat-label {
  font-size: 11px;
  color: ${theme.text.muted};
  text-transform: uppercase;
}

/* Responsive for new sections */
@media (max-width: 1200px) {
  .market-overview-grid { grid-template-columns: repeat(2, 1fr); }
  .partners-grid { grid-template-columns: repeat(3, 1fr); }
  .profit-stats-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .market-overview-grid { grid-template-columns: 1fr; }
  .partners-grid { grid-template-columns: repeat(2, 1fr); }
  .profit-stats-row { grid-template-columns: 1fr; }
  .footer-stats { flex-wrap: wrap; gap: 20px; }
  .security-badges { flex-direction: column; align-items: center; }
  .live-ticker { display: none; }
  .platform-page { padding-top: 0; }
  .platform-header { top: 0; }
  .hero-section { margin-top: 0; }
  .toast-container { right: 10px; left: 10px; top: 100px; }
  .toast { min-width: auto; }
}

/* Header - positioned below the ticker */
.platform-header {
  position: sticky; 
  top: 32px; /* Below the live ticker */
  z-index: 100;
  background: ${theme.bg.secondary};
  border-bottom: 1px solid ${theme.border.primary};
  backdrop-filter: blur(10px);
}
.header-content {
  max-width: 1800px; margin: 0 auto;
  padding: 12px 20px;
  display: flex; justify-content: space-between; align-items: center;
}
.header-left, .header-right { display: flex; align-items: center; gap: 20px; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { 
  width: 40px; height: 40px; 
  background: ${theme.gradient.lemon}; 
  border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
  color: ${theme.bg.primary}; 
  box-shadow: 0 0 20px ${theme.accent.lemon}40;
}
.logo-text { font-size: 22px; font-weight: 800; color: ${theme.text.primary}; }
.logo-accent { color: ${theme.accent.lemon}; }
.main-nav { display: flex; gap: 24px; }
.main-nav a { 
  color: ${theme.text.secondary}; 
  text-decoration: none; 
  font-size: 13px; 
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}
.main-nav a:hover { 
  color: ${theme.accent.lemon}; 
  background: ${theme.accent.lemon}10;
}
.lang-switch { display: flex; background: ${theme.bg.tertiary}; border-radius: 6px; padding: 3px; border: 1px solid ${theme.border.primary}; }
.lang-switch button { padding: 6px 10px; background: none; border: none; color: ${theme.text.muted}; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
.lang-switch button:hover { color: ${theme.text.primary}; }
.lang-switch button.active { background: ${theme.accent.lemon}; color: ${theme.bg.primary}; }

/* Wallet Connection Styles */
.wallet-section { position: relative; }
.connect-wallet-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  background: ${theme.gradient.lemon};
  border: none;
  border-radius: 8px;
  color: ${theme.bg.primary};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 20px ${theme.accent.lemon}30;
}
.connect-wallet-btn:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 30px ${theme.accent.lemon}40;
}
.connect-wallet-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.wallet-connected { position: relative; }
.wallet-info-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.lemon};
  border-radius: 8px;
  color: ${theme.text.primary};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.wallet-info-btn:hover { border-color: ${theme.accent.lemon}; background: ${theme.bg.hover}; }
.wallet-status-dot { width: 8px; height: 8px; background: ${theme.accent.lemon}; border-radius: 50%; box-shadow: 0 0 8px ${theme.accent.lemon}; }
.wallet-balance { font-weight: 700; color: ${theme.accent.lemon}; }
.wallet-addr { color: ${theme.text.secondary}; font-family: monospace; font-size: 11px; }

.wallet-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 8px;
  width: 320px;
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.lemon};
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${theme.accent.lemon}10;
  z-index: 1000;
}
.wallet-dropdown-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${theme.border.primary}; }
.connected-label { display: flex; align-items: center; gap: 6px; color: ${theme.accent.green}; font-size: 12px; font-weight: 600; }
.wallet-dropdown-balance { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.balance-label { color: ${theme.text.muted}; font-size: 12px; }
.balance-value { color: ${theme.accent.lemon}; font-size: 20px; font-weight: 700; }
.wallet-dropdown-address { 
  display: flex; align-items: center; gap: 8px; 
  padding: 10px; 
  background: ${theme.bg.tertiary}; 
  border-radius: 8px; 
  margin-bottom: 16px;
}
.address-full { 
  flex: 1; 
  font-family: monospace; 
  font-size: 10px; 
  color: ${theme.text.secondary}; 
  word-break: break-all;
}
.wallet-dropdown-address button { 
  background: none; border: none; 
  color: ${theme.text.muted}; 
  cursor: pointer; 
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}
.wallet-dropdown-address button:hover { color: ${theme.accent.lemon}; background: ${theme.bg.hover}; }
.wallet-dropdown-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.deposit-btn, .withdraw-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px;
  border: 1px solid ${theme.border.secondary};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.deposit-btn { background: ${theme.accent.green}20; color: ${theme.accent.green}; border-color: ${theme.accent.green}30; }
.deposit-btn:hover { background: ${theme.accent.green}30; }
.withdraw-btn { background: ${theme.bg.tertiary}; color: ${theme.text.secondary}; }
.withdraw-btn:hover { border-color: ${theme.text.muted}; color: ${theme.text.primary}; }
.disconnect-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px;
  background: ${theme.accent.red}15;
  border: 1px solid ${theme.accent.red}30;
  border-radius: 6px;
  color: ${theme.accent.red};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.disconnect-btn:hover { background: ${theme.accent.red}25; }

.back-btn { 
  display: flex; 
  align-items: center; 
  justify-content: center;
  width: 40px;
  height: 40px;
  color: ${theme.text.primary}; 
  text-decoration: none; 
  background: ${theme.bg.tertiary}; 
  border: 1px solid ${theme.border.primary};
  border-radius: 10px;
  transition: all 0.2s;
}
.back-btn:hover { 
  background: ${theme.accent.lemon}; 
  color: ${theme.bg.primary};
  border-color: ${theme.accent.lemon};
  transform: translateX(-2px);
}
.launch-badge { 
  display: flex; align-items: center; gap: 6px; 
  padding: 8px 14px; 
  background: ${theme.accent.lemon}15; 
  border: 1px solid ${theme.accent.lemon}40; 
  border-radius: 20px; 
  color: ${theme.accent.lemon}; 
  font-size: 10px; 
  font-weight: 700; 
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px ${theme.accent.lemon}50;
}

/* Hero */
.hero-section { 
  padding: 80px 20px 60px; 
  text-align: center; 
  position: relative; 
  z-index: 1;
  background: radial-gradient(ellipse at center, ${theme.accent.lemon}08 0%, transparent 60%);
}
.hero-content { 
  max-width: 900px; 
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Coming Soon Banner */
.coming-soon-banner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 24px;
  background: ${theme.gradient.lemon};
  border-radius: 30px;
  box-shadow: 0 0 30px ${theme.accent.lemon}50, 0 0 60px ${theme.accent.lemon}20;
  animation: pulse-glow 2.5s ease-in-out infinite;
}

.coming-soon-banner svg {
  color: ${theme.bg.primary};
  width: 16px;
  height: 16px;
  animation: sparkle 1.5s ease-in-out infinite;
}

.coming-soon-text {
  font-size: 14px;
  font-weight: 800;
  color: ${theme.bg.primary};
  letter-spacing: 3px;
  text-transform: uppercase;
}

@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 0 30px ${theme.accent.lemon}50, 0 0 60px ${theme.accent.lemon}20;
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 40px ${theme.accent.lemon}60, 0 0 80px ${theme.accent.lemon}30;
    transform: scale(1.01);
  }
}

@keyframes sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.15); }
}

.hero-badge { 
  display: inline-flex; align-items: center; gap: 8px; 
  padding: 10px 20px; 
  background: ${theme.accent.lemon}10; 
  border: 1px solid ${theme.accent.lemon}30; 
  border-radius: 24px; 
  color: ${theme.accent.lemon}; 
  font-size: 13px; 
  font-weight: 600;
  margin-bottom: 24px;
  box-shadow: 0 0 30px ${theme.accent.lemon}15;
}
.hero-section h1 { font-size: 56px; font-weight: 800; margin-bottom: 20px; line-height: 1.1; letter-spacing: -1px; }
.gradient { 
  background: ${theme.gradient.lemon}; 
  -webkit-background-clip: text; 
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px ${theme.accent.lemon}30;
}
.hero-section p { font-size: 17px; color: ${theme.text.secondary}; max-width: 700px; margin: 0 auto 36px; line-height: 1.7; }
.hero-stats { display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; margin-bottom: 40px; }
.stat { 
  padding: 20px 24px; 
  background: ${theme.bg.tertiary}; 
  border: 1px solid ${theme.border.lemon}; 
  border-radius: 12px; 
  min-width: 110px;
  transition: all 0.3s;
}
.stat:hover { 
  transform: translateY(-4px); 
  box-shadow: 0 12px 30px ${theme.accent.lemon}15;
  border-color: ${theme.accent.lemon}60;
}
.stat .value { display: block; font-size: 28px; font-weight: 800; color: ${theme.accent.lemon}; }
.stat .label { font-size: 11px; color: ${theme.text.muted}; text-transform: uppercase; letter-spacing: 0.5px; }
.hero-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
.btn-primary, .btn-secondary { 
  display: inline-flex; align-items: center; gap: 8px; 
  padding: 14px 28px; 
  border-radius: 10px; 
  font-size: 14px; 
  font-weight: 700; 
  cursor: pointer; 
  transition: all 0.2s; 
  text-decoration: none; 
}
.btn-primary { 
  background: ${theme.gradient.lemon}; 
  color: ${theme.bg.primary}; 
  border: none;
  box-shadow: 0 0 25px ${theme.accent.lemon}40;
}
.btn-primary:hover { 
  transform: translateY(-3px); 
  box-shadow: 0 12px 35px ${theme.accent.lemon}50; 
}
.btn-secondary { 
  background: transparent; 
  color: ${theme.text.primary}; 
  border: 1px solid ${theme.border.secondary}; 
}
.btn-secondary:hover { 
  border-color: ${theme.accent.lemon}; 
  color: ${theme.accent.lemon};
  background: ${theme.accent.lemon}10;
}

/* Sections */
.section { padding: 70px 20px; position: relative; z-index: 1; max-width: 1800px; margin: 0 auto; }
.section.dark { background: ${theme.bg.secondary}; max-width: none; }
.section.dark > * { max-width: 1800px; margin-left: auto; margin-right: auto; padding-left: 20px; padding-right: 20px; }
.section-header { display: flex; align-items: flex-start; gap: 18px; margin-bottom: 36px; }
.section-icon { 
  width: 52px; height: 52px; 
  background: ${theme.accent.lemon}15; 
  border: 1px solid ${theme.accent.lemon}30; 
  border-radius: 14px; 
  display: flex; align-items: center; justify-content: center; 
  color: ${theme.accent.lemon}; 
  flex-shrink: 0;
}
.section-icon.gold { 
  background: ${theme.accent.orange}15; 
  border-color: ${theme.accent.orange}30; 
  color: ${theme.accent.orange};
}
.section-header h2 { font-size: 30px; font-weight: 800; margin-bottom: 6px; }
.section-header p { font-size: 15px; color: ${theme.text.secondary}; }

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* TRADING PLATFORM STYLES - TREASURY MINTING THEME */
/* ═══════════════════════════════════════════════════════════════════════════════ */

.trading-platform {
  background: ${theme.bg.primary};
  border: 1px solid ${theme.border.lemon};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${theme.accent.lemon}08;
}

/* Top Bar */
.platform-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px;
  background: ${theme.bg.secondary};
  border-bottom: 1px solid ${theme.border.primary};
}
.topbar-left { display: flex; align-items: center; gap: 24px; }
.symbol-selector { display: flex; align-items: center; gap: 10px; }
.current-symbol { font-size: 16px; font-weight: 700; color: ${theme.text.primary}; }
.symbol-exchange { font-size: 12px; color: ${theme.text.muted}; }
.market-status { 
  font-size: 11px; 
  color: ${theme.text.muted}; 
  margin-left: 10px;
  padding: 4px 10px;
  background: ${theme.bg.tertiary};
  border-radius: 4px;
}
.market-status.connected { 
  color: ${theme.accent.lemon}; 
  background: ${theme.accent.lemon}15;
  box-shadow: 0 0 10px ${theme.accent.lemon}20;
}
.timeframe-selector { display: flex; gap: 3px; background: ${theme.bg.tertiary}; padding: 3px; border-radius: 6px; }
.timeframe-selector button { 
  padding: 6px 12px; 
  background: none; 
  border: none; 
  color: ${theme.text.muted}; 
  font-size: 11px; 
  font-weight: 600;
  cursor: pointer; 
  border-radius: 4px;
  transition: all 0.2s;
}
.timeframe-selector button:hover { color: ${theme.text.primary}; background: ${theme.bg.hover}; }
.timeframe-selector button.active { background: ${theme.accent.lemon}; color: ${theme.bg.primary}; }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.chart-controls { display: flex; gap: 4px; }
.chart-controls button { 
  width: 32px; height: 32px; 
  background: none; 
  border: 1px solid transparent; 
  color: ${theme.text.muted}; 
  cursor: pointer; 
  display: flex; align-items: center; justify-content: center; 
  border-radius: 6px;
  transition: all 0.2s;
}
.chart-controls button:hover { background: ${theme.bg.tertiary}; color: ${theme.text.primary}; border-color: ${theme.border.primary}; }
.chart-controls button.active { background: ${theme.accent.lemon}20; color: ${theme.accent.lemon}; border-color: ${theme.accent.lemon}40; }
.time-display { font-size: 12px; color: ${theme.text.secondary}; font-family: monospace; padding: 6px 10px; background: ${theme.bg.tertiary}; border-radius: 4px; }

/* Platform Body */
.platform-body { display: grid; grid-template-columns: 44px 1fr 100px 280px; min-height: 600px; }

/* Left Toolbar */
.toolbar-left {
  background: ${theme.bg.secondary};
  border-right: 1px solid ${theme.border.primary};
  padding: 8px 6px;
  display: flex; flex-direction: column; gap: 2px;
}
.tool {
  width: 32px; height: 32px;
  background: none; border: none;
  color: ${theme.text.muted};
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer;
}
.tool:hover { background: ${theme.bg.tertiary}; color: ${theme.text.primary}; }
.tool.active { background: ${theme.accent.blue}; color: white; }
.tool-divider { height: 1px; background: ${theme.border.primary}; margin: 6px 0; }

/* Chart Area */
.chart-area { background: ${theme.bg.primary}; display: flex; flex-direction: column; position: relative; }

.chart-info-bar {
  display: flex; align-items: center; gap: 24px;
  padding: 10px 16px;
  background: ${theme.bg.secondary};
  border-bottom: 1px solid ${theme.border.primary};
  flex-wrap: wrap;
}
.ohlc-display { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.ohlc-display .label { color: ${theme.text.muted}; font-weight: 500; }
.ohlc-display .value { color: ${theme.text.primary}; font-family: monospace; font-weight: 600; }
.ohlc-display .value.high { color: ${theme.chart.up}; }
.ohlc-display .value.low { color: ${theme.chart.down}; }
.ohlc-display .change { padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; }
.ohlc-display .change.up { background: ${theme.chart.up}25; color: ${theme.chart.up}; }
.ohlc-display .change.down { background: ${theme.chart.down}25; color: ${theme.chart.down}; }
.indicator-labels { display: flex; gap: 16px; font-size: 12px; }
.indicator-labels .indicator { display: flex; gap: 6px; align-items: center; }
.indicator-labels .ma1 { color: ${theme.accent.lemon}; }
.indicator-labels .ma2 { color: ${theme.chart.ma2}; }
.indicator-labels b { font-weight: 600; }
.indicator-labels b.high { color: ${theme.chart.up}; }
.indicator-labels b.low { color: ${theme.chart.down}; }
.volume-display { font-size: 12px; color: ${theme.text.muted}; margin-left: auto; }
.volume-display .value { color: ${theme.text.primary}; font-weight: 600; }

.main-chart { 
  flex: 1; 
  position: relative; 
  padding: 12px; 
  padding-right: 75px; 
  min-height: 420px;
  background: ${theme.bg.primary};
}
.main-chart .chart-svg { 
  width: 100%; 
  height: 100%; 
  min-height: 400px;
}
.candle-group { transition: opacity 0.1s; }
.candle-group:hover { opacity: 0.85; }

.price-scale {
  position: absolute; right: 0; top: 12px; bottom: 12px;
  width: 70px; 
  background: ${theme.bg.secondary};
  border-left: 1px solid ${theme.border.primary};
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 8px 10px;
  font-size: 11px; 
  font-family: monospace; 
  color: ${theme.text.secondary};
}
.price-level { text-align: right; }

.volume-chart, .macd-chart, .rsi-chart {
  border-top: 1px solid ${theme.border.primary};
  padding: 8px 12px;
  padding-right: 75px;
  position: relative;
  background: ${theme.bg.primary};
}
.volume-chart svg, .macd-chart svg, .rsi-chart svg { width: 100%; height: 100%; display: block; }
.indicator-label {
  position: absolute; top: 8px; left: 12px;
  font-size: 11px; color: ${theme.text.muted};
  display: flex; gap: 10px;
  font-weight: 500;
}
.macd-val { color: ${theme.accent.blue}; font-weight: 600; }
.signal-val { color: ${theme.chart.ma2}; font-weight: 600; }
.hist-val { color: ${theme.chart.down}; font-weight: 600; }
.rsi-val { color: ${theme.accent.purple}; font-weight: 600; }

.time-scale {
  display: flex; justify-content: space-around;
  padding: 8px 75px 8px 12px;
  font-size: 11px; color: ${theme.text.muted};
  border-top: 1px solid ${theme.border.primary};
  background: ${theme.bg.secondary};
}

/* DOM Ladder */
.dom-ladder {
  background: ${theme.bg.secondary};
  border-left: 1px solid ${theme.border.primary};
  border-right: 1px solid ${theme.border.primary};
  display: flex; flex-direction: column;
  font-size: 10px;
}
.dom-header {
  padding: 6px 8px;
  background: ${theme.bg.tertiary};
  border-bottom: 1px solid ${theme.border.primary};
  color: ${theme.text.muted};
  text-align: center;
}
.dom-body { flex: 1; overflow-y: auto; }
.dom-row {
  display: grid; grid-template-columns: 30px 40px 30px;
  position: relative;
  border-bottom: 1px solid ${theme.border.primary};
}
.dom-row.current { background: ${theme.bg.tertiary}; }
.dom-ask-vol, .dom-bid-vol { padding: 2px 4px; text-align: center; color: ${theme.text.muted}; }
.dom-price { padding: 2px 4px; text-align: center; font-family: monospace; color: ${theme.text.secondary}; }
.dom-price.highlight { background: ${theme.chart.down}; color: white; font-weight: 600; }
.dom-ask-bar, .dom-bid-bar { position: absolute; top: 0; height: 100%; opacity: 0.3; }
.dom-ask-bar { right: 0; background: ${theme.chart.down}; }
.dom-bid-bar { left: 0; background: ${theme.chart.up}; }

/* Right Panel */
.right-panel {
  background: ${theme.bg.secondary};
  border-left: 1px solid ${theme.border.primary};
  display: flex; flex-direction: column;
  overflow-y: auto;
}

/* Watchlist */
.watchlist-panel { border-bottom: 1px solid ${theme.border.primary}; }
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px;
  background: ${theme.bg.tertiary};
  border-bottom: 1px solid ${theme.border.primary};
}
.panel-title { font-size: 13px; font-weight: 700; color: ${theme.text.primary}; }
.panel-actions { display: flex; gap: 4px; }
.panel-actions button { 
  width: 26px; height: 26px; 
  background: none; border: none; 
  color: ${theme.text.muted}; 
  cursor: pointer; 
  display: flex; align-items: center; justify-content: center; 
  border-radius: 5px;
  transition: all 0.2s;
}
.panel-actions button:hover { background: ${theme.accent.lemon}15; color: ${theme.accent.lemon}; }
.watchlist-header {
  display: grid; grid-template-columns: 1fr 70px 60px 50px;
  padding: 6px 14px;
  font-size: 10px; 
  color: ${theme.text.muted};
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid ${theme.border.primary};
}
.watchlist-body { max-height: 200px; overflow-y: auto; }
.watchlist-row {
  display: grid; grid-template-columns: 1fr 70px 60px 50px;
  padding: 8px 14px;
  font-size: 11px;
  cursor: pointer;
  border-bottom: 1px solid ${theme.border.primary};
  transition: all 0.15s;
}
.watchlist-row:hover { background: ${theme.bg.hover}; }
.watchlist-row.active { 
  background: ${theme.accent.lemon}12; 
  border-left: 3px solid ${theme.accent.lemon};
}
.watchlist-row .symbol { display: flex; align-items: center; gap: 5px; color: ${theme.text.primary}; font-weight: 600; }
.watchlist-row .symbol svg { opacity: 0; }
.watchlist-row .symbol svg.visible { opacity: 1; color: ${theme.accent.lemon}; }
.watchlist-row .last { font-family: monospace; text-align: right; font-weight: 600; }
.watchlist-row .chg, .watchlist-row .chg-pct { font-family: monospace; text-align: right; }
.watchlist-row .up { color: ${theme.chart.up}; }
.watchlist-row .down { color: ${theme.chart.down}; }

/* Symbol Info */
.symbol-info-panel { padding: 14px; border-bottom: 1px solid ${theme.border.primary}; }
.symbol-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.symbol-icon { 
  width: 40px; height: 40px; 
  background: ${theme.accent.lemon}15; 
  border: 1px solid ${theme.accent.lemon}30;
  border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
  color: ${theme.accent.lemon};
}
.symbol-details { display: flex; flex-direction: column; gap: 2px; }
.symbol-name { font-size: 15px; font-weight: 700; color: ${theme.text.primary}; }
.symbol-desc { font-size: 11px; color: ${theme.text.secondary}; }
.symbol-type { font-size: 10px; color: ${theme.text.muted}; }
.current-price-display { margin-bottom: 6px; }
.big-price { font-size: 32px; font-weight: 800; color: ${theme.text.primary}; font-family: monospace; }
.big-price .decimal { font-size: 32px; color: ${theme.accent.lemon}; }
.big-price .small { font-size: 20px; color: ${theme.text.secondary}; }
.price-suffix { font-size: 14px; color: ${theme.text.muted}; margin-left: 6px; }
.price-change { font-size: 14px; margin-bottom: 10px; font-weight: 600; }
.price-change.up { color: ${theme.chart.up}; }
.price-change.down { color: ${theme.chart.down}; }
.market-status-badge { font-size: 11px; color: ${theme.accent.lemon}; margin-bottom: 14px; font-weight: 600; }
.bid-ask-display { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.bid-box, .ask-box { 
  padding: 10px; 
  background: ${theme.bg.tertiary}; 
  border: 1px solid ${theme.border.primary};
  border-radius: 6px; 
  text-align: center;
}
.bid-box .label, .ask-box .label { display: block; font-size: 10px; color: ${theme.text.muted}; margin-bottom: 4px; font-weight: 600; }
.bid-box .value { color: ${theme.chart.up}; font-family: monospace; font-weight: 700; font-size: 14px; }
.ask-box .value { color: ${theme.chart.down}; font-family: monospace; font-weight: 700; font-size: 14px; }
.range-display { font-size: 11px; }
.range-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
.range-row .label { color: ${theme.text.muted}; font-weight: 500; }
.range-row .value { color: ${theme.text.secondary}; font-family: monospace; }
.range-bar { height: 6px; background: ${theme.bg.tertiary}; border-radius: 3px; position: relative; margin: 10px 0; }
.range-fill { position: absolute; height: 100%; background: linear-gradient(90deg, ${theme.chart.down}, ${theme.text.muted}, ${theme.chart.up}); border-radius: 3px; }
.range-marker { position: absolute; width: 3px; height: 10px; background: ${theme.accent.lemon}; top: -2px; transform: translateX(-50%); border-radius: 2px; }

/* Performance */
.performance-panel { padding: 0 12px 12px; border-bottom: 1px solid ${theme.border.primary}; }
.performance-panel .panel-header { padding: 8px 0; background: none; border: none; }
.performance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.perf-item { text-align: center; padding: 6px; background: ${theme.bg.tertiary}; border-radius: 4px; }
.perf-item .period { display: block; font-size: 10px; color: ${theme.text.muted}; }
.perf-item .value { font-size: 12px; font-weight: 600; }
.perf-item.up .value { color: ${theme.chart.up}; }
.perf-item.down .value { color: ${theme.chart.down}; }

/* Technicals Gauge */
.technicals-panel { padding: 0 12px 12px; border-bottom: 1px solid ${theme.border.primary}; }
.technicals-panel .panel-header { padding: 8px 0; background: none; border: none; }
.gauge-container { display: flex; justify-content: center; }
.gauge-svg { width: 180px; height: 100px; }

/* Trade Panel */
.trade-panel { padding: 14px; margin-top: auto; background: ${theme.bg.tertiary}; border-top: 1px solid ${theme.border.primary}; }
.order-controls { display: flex; gap: 8px; margin-bottom: 12px; }
.order-controls button { 
  flex: 1; 
  padding: 10px; 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.secondary}; 
  border-radius: 6px; 
  color: ${theme.text.secondary}; 
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.order-controls button:hover { border-color: ${theme.accent.lemon}40; color: ${theme.accent.lemon}; background: ${theme.accent.lemon}10; }
.order-amount { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.amt-btn { 
  width: 36px; height: 36px; 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.secondary}; 
  border-radius: 6px; 
  color: ${theme.accent.lemon}; 
  font-size: 18px; 
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.amt-btn:hover { background: ${theme.accent.lemon}20; border-color: ${theme.accent.lemon}40; }
.order-amount input { 
  flex: 1; height: 36px; 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.secondary}; 
  border-radius: 6px; 
  color: ${theme.text.primary}; 
  text-align: center; 
  font-size: 15px; 
  font-weight: 700; 
  font-family: monospace;
}
.order-amount input:focus { outline: none; border-color: ${theme.accent.lemon}; box-shadow: 0 0 15px ${theme.accent.lemon}20; }
.unit-select { 
  height: 36px; 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.secondary}; 
  border-radius: 6px; 
  color: ${theme.text.secondary}; 
  font-size: 11px; 
  font-weight: 600;
  padding: 0 10px; 
  cursor: pointer;
}
.order-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.buy-mkt-btn, .sell-mkt-btn { 
  padding: 16px; 
  border: none; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 700; 
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.buy-mkt-btn { 
  background: ${theme.chart.up}; 
  color: white;
  box-shadow: 0 4px 15px ${theme.chart.up}40;
}
.sell-mkt-btn { 
  background: ${theme.chart.down}; 
  color: white;
  box-shadow: 0 4px 15px ${theme.chart.down}40;
}
.buy-mkt-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px ${theme.chart.up}50; }
.sell-mkt-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px ${theme.chart.down}50; }

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* ENHANCED TERMINAL FEATURES */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/* Fullscreen Mode */
.trading-platform.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
}

/* Chart Type Selector */
.chart-type-selector {
  display: flex;
  gap: 2px;
  background: ${theme.bg.tertiary};
  padding: 2px;
  border-radius: 6px;
  margin-left: 12px;
}

.chart-type-selector button {
  padding: 6px 10px;
  background: none;
  border: none;
  color: ${theme.text.muted};
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.chart-type-selector button:hover { color: ${theme.text.primary}; background: ${theme.bg.hover}; }
.chart-type-selector button.active { background: ${theme.accent.lemon}; color: ${theme.bg.primary}; }

/* Indicator Toggles */
.indicator-toggles {
  display: flex;
  gap: 4px;
  margin-right: 12px;
}

.indicator-btn {
  padding: 4px 10px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 4px;
  color: ${theme.text.muted};
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.indicator-btn:hover { border-color: ${theme.accent.cyan}; color: ${theme.accent.cyan}; }
.indicator-btn.active { 
  background: ${theme.accent.cyan}20; 
  border-color: ${theme.accent.cyan}; 
  color: ${theme.accent.cyan}; 
}

/* Alert Badge on Bell Button */
.chart-controls button.has-alert { color: ${theme.accent.orange}; }
.alert-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  background: ${theme.accent.red};
  border-radius: 50%;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
}

.chart-controls button { position: relative; }

/* Stochastic Chart */
.stochastic-chart {
  border-top: 1px solid ${theme.border.primary};
  padding: 8px 12px;
  padding-right: 75px;
  position: relative;
  background: ${theme.bg.primary};
}

.stochastic-chart svg { width: 100%; height: 100%; display: block; }

.stoch-k { color: ${theme.accent.cyan}; font-weight: 600; margin-left: 10px; }
.stoch-d { color: ${theme.accent.orange}; font-weight: 600; margin-left: 10px; }

/* Enhanced Bottom Bar */
.platform-bottombar.enhanced {
  flex-direction: column;
  padding: 0;
  min-height: 180px;
}

.platform-bottombar.enhanced .bottom-tabs {
  display: flex;
  gap: 0;
  padding: 0 12px;
  background: ${theme.bg.tertiary};
  border-bottom: 1px solid ${theme.border.primary};
  width: 100%;
}

.platform-bottombar.enhanced .bottom-tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: ${theme.text.muted};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.platform-bottombar.enhanced .bottom-tabs button:hover {
  color: ${theme.text.primary};
  background: ${theme.bg.hover};
}

.platform-bottombar.enhanced .bottom-tabs button.active {
  color: ${theme.accent.lemon};
  border-bottom-color: ${theme.accent.lemon};
  background: ${theme.accent.lemon}08;
}

.tab-badge {
  padding: 2px 6px;
  background: ${theme.bg.secondary};
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  color: ${theme.text.secondary};
}

.tab-badge.alert { background: ${theme.accent.orange}30; color: ${theme.accent.orange}; }

.bottom-panel-content {
  flex: 1;
  overflow: auto;
  padding: 10px 12px;
}

/* Positions/Orders Table */
.positions-table, .orders-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 60px 80px 90px 90px 80px 70px 50px 90px;
  gap: 8px;
  padding: 8px 12px;
  background: ${theme.bg.tertiary};
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: ${theme.text.muted};
  text-transform: uppercase;
  margin-bottom: 4px;
}

.orders-table .table-header {
  grid-template-columns: 60px 100px 70px 60px 90px 80px 80px 40px;
}

.table-row {
  display: grid;
  grid-template-columns: 100px 60px 80px 90px 90px 80px 70px 50px 90px;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  border-bottom: 1px solid ${theme.border.primary};
  align-items: center;
  transition: background 0.2s;
}

.table-row:hover { background: ${theme.bg.tertiary}; }

.orders-table .table-row {
  grid-template-columns: 60px 100px 70px 60px 90px 80px 80px 40px;
}

.table-row.profit { background: ${theme.chart.up}05; }
.table-row.loss { background: ${theme.chart.down}05; }

.symbol-cell { font-weight: 600; color: ${theme.text.primary}; }
.side-cell { font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 3px; text-align: center; }
.side-cell.long, .side-cell.buy { background: ${theme.chart.up}20; color: ${theme.chart.up}; }
.side-cell.short, .side-cell.sell { background: ${theme.chart.down}20; color: ${theme.chart.down}; }
.mono { font-family: monospace; }
.pnl-cell { font-weight: 700; }
.pnl-cell.positive { color: ${theme.chart.up}; }
.pnl-cell.negative { color: ${theme.chart.down}; }
.leverage-cell { color: ${theme.accent.orange}; font-weight: 600; }
.liq-cell { color: ${theme.chart.down}; font-size: 11px; }
.order-id { color: ${theme.text.muted}; font-family: monospace; }
.type-cell { color: ${theme.accent.blue}; font-weight: 600; font-size: 10px; }
.status-cell { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
.status-cell.pending { background: ${theme.accent.orange}20; color: ${theme.accent.orange}; }
.status-cell.partial { background: ${theme.accent.blue}20; color: ${theme.accent.blue}; }
.status-cell.cancelled { background: ${theme.text.muted}20; color: ${theme.text.muted}; }

.cancel-btn {
  padding: 4px;
  background: none;
  border: 1px solid ${theme.border.secondary};
  border-radius: 4px;
  color: ${theme.text.muted};
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover { border-color: ${theme.chart.down}; color: ${theme.chart.down}; background: ${theme.chart.down}10; }

.empty-state {
  text-align: center;
  padding: 30px;
  color: ${theme.text.muted};
  font-size: 13px;
}

/* Alerts Panel */
.alerts-panel { display: flex; flex-direction: column; gap: 8px; }

.alerts-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.add-alert-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${theme.accent.lemon}15;
  border: 1px solid ${theme.accent.lemon}40;
  border-radius: 6px;
  color: ${theme.accent.lemon};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-alert-btn:hover { background: ${theme.accent.lemon}25; }

.alerts-list { display: flex; flex-direction: column; gap: 6px; }

.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.primary};
  border-radius: 8px;
  font-size: 12px;
}

.alert-item svg { color: ${theme.accent.orange}; }
.alert-item svg.triggered { color: ${theme.chart.up}; }
.alert-item.triggered { border-color: ${theme.chart.up}40; background: ${theme.chart.up}08; }
.alert-item.inactive { opacity: 0.5; }

.alert-symbol { font-weight: 600; color: ${theme.text.primary}; }
.alert-condition { color: ${theme.text.muted}; }
.alert-price { font-family: monospace; font-weight: 600; color: ${theme.accent.orange}; }
.alert-status { margin-left: auto; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.alert-status.active { background: ${theme.accent.orange}20; color: ${theme.accent.orange}; }
.alert-status.triggered { background: ${theme.chart.up}20; color: ${theme.chart.up}; }
.alert-status.inactive { background: ${theme.text.muted}20; color: ${theme.text.muted}; }

.delete-alert-btn {
  padding: 4px;
  background: none;
  border: none;
  color: ${theme.text.muted};
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-alert-btn:hover { color: ${theme.chart.down}; background: ${theme.chart.down}15; }

/* News Panel */
.news-panel { display: flex; flex-direction: column; gap: 8px; }

.news-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background: ${theme.bg.tertiary};
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.news-item:hover { background: ${theme.bg.hover}; }

.news-impact {
  font-size: 10px;
  flex-shrink: 0;
}

.news-content { flex: 1; }
.news-title { font-size: 12px; font-weight: 600; color: ${theme.text.primary}; display: block; margin-bottom: 4px; }
.news-meta { display: flex; gap: 12px; font-size: 10px; color: ${theme.text.muted}; }
.news-source { font-weight: 600; }
.news-symbol { 
  padding: 1px 6px; 
  background: ${theme.accent.lemon}15; 
  border-radius: 3px; 
  color: ${theme.accent.lemon}; 
  font-weight: 600; 
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.alert-modal {
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.lemon};
  border-radius: 16px;
  width: 400px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 40px ${theme.accent.lemon}15;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid ${theme.border.primary};
  font-size: 16px;
  font-weight: 700;
  color: ${theme.text.primary};
}

.modal-header svg { color: ${theme.accent.lemon}; }
.modal-header button { 
  margin-left: auto; 
  background: none; 
  border: none; 
  color: ${theme.text.muted}; 
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.modal-header button:hover { color: ${theme.text.primary}; background: ${theme.bg.hover}; }

.modal-body { padding: 20px; }

.modal-field {
  margin-bottom: 16px;
}

.modal-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: ${theme.text.muted};
  text-transform: uppercase;
  margin-bottom: 6px;
}

.modal-field .field-value {
  font-size: 14px;
  font-weight: 600;
  color: ${theme.text.primary};
}

.condition-btns {
  display: flex;
  gap: 8px;
}

.condition-btns button {
  flex: 1;
  padding: 10px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 8px;
  color: ${theme.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.condition-btns button:hover { border-color: ${theme.accent.lemon}40; }
.condition-btns button.active { 
  background: ${theme.accent.lemon}15; 
  border-color: ${theme.accent.lemon}; 
  color: ${theme.accent.lemon}; 
}

.modal-field input {
  width: 100%;
  padding: 12px 14px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 8px;
  color: ${theme.text.primary};
  font-size: 14px;
  font-family: monospace;
}

.modal-field input:focus {
  outline: none;
  border-color: ${theme.accent.lemon};
  box-shadow: 0 0 15px ${theme.accent.lemon}20;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid ${theme.border.primary};
}

.cancel-modal-btn {
  flex: 1;
  padding: 12px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 8px;
  color: ${theme.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-modal-btn:hover { border-color: ${theme.text.muted}; color: ${theme.text.primary}; }

.create-alert-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: ${theme.gradient.lemon};
  border: none;
  border-radius: 8px;
  color: ${theme.bg.primary};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.create-alert-btn:hover { transform: scale(1.02); box-shadow: 0 0 20px ${theme.accent.lemon}40; }

/* Bottom Bar Old Styles (keeping for compatibility) */
.platform-bottombar:not(.enhanced) {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px;
  background: ${theme.bg.secondary};
  border-top: 1px solid ${theme.border.primary};
}
.platform-bottombar:not(.enhanced) .bottom-tabs { display: flex; gap: 4px; }
.platform-bottombar:not(.enhanced) .bottom-tabs button { padding: 6px 12px; background: none; border: none; color: ${theme.text.muted}; font-size: 11px; cursor: pointer; border-radius: 4px; }
.platform-bottombar:not(.enhanced) .bottom-tabs button:hover { background: ${theme.bg.tertiary}; color: ${theme.text.primary}; }
.bottom-info { display: flex; gap: 12px; font-size: 11px; color: ${theme.text.muted}; }
.order-status { color: ${theme.accent.green}; }

/* Currency Grid */
.currencies-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.currency-card { 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.primary}; 
  border-radius: 12px; 
  padding: 18px; 
  display: flex; flex-direction: column; gap: 10px; 
  transition: all 0.3s;
}
.currency-card:hover { 
  border-color: ${theme.accent.lemon}; 
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.3), 0 0 20px ${theme.accent.lemon}15;
}
.currency-card .flag { font-size: 30px; }
.currency-card .info { display: flex; flex-direction: column; gap: 4px; }
.currency-card .code { font-size: 15px; font-weight: 800; color: ${theme.accent.lemon}; }
.currency-card .name { font-size: 11px; color: ${theme.text.muted}; }
.currency-card .rate { display: flex; align-items: baseline; gap: 4px; }
.currency-card .rate .value { font-size: 16px; font-weight: 700; font-family: monospace; color: ${theme.text.primary}; }
.currency-card .rate .label { font-size: 10px; color: ${theme.text.muted}; }
.currency-card .verified { display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${theme.accent.green}; font-weight: 600; }

/* Commodities */
.commodity-category { margin-bottom: 32px; }
.commodity-category h3 { 
  display: flex; align-items: center; gap: 10px; 
  font-size: 18px; font-weight: 700; 
  margin-bottom: 18px; 
  padding-left: 20px; 
  color: ${theme.text.primary};
}
.commodity-category h3 svg { color: ${theme.accent.orange}; }
.commodities-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; padding: 0 20px; }
.commodity-card { 
  display: flex; align-items: center; gap: 14px; 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.primary}; 
  border-radius: 10px; 
  padding: 16px; 
  transition: all 0.3s;
}
.commodity-card:hover { 
  border-color: ${theme.accent.orange}; 
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.3), 0 0 20px ${theme.accent.orange}15;
}
.commodity-card .icon { font-size: 30px; }
.commodity-card .info { flex: 1; }
.commodity-card .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.commodity-card .code { font-size: 14px; font-weight: 800; color: ${theme.accent.lemon}; }
.commodity-card .change { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
.commodity-card .change.up { color: ${theme.chart.up}; background: ${theme.chart.up}15; }
.commodity-card .change.down { color: ${theme.chart.down}; background: ${theme.chart.down}15; }
.commodity-card .name { font-size: 11px; color: ${theme.text.muted}; display: block; margin-bottom: 6px; }
.commodity-card .price { display: flex; align-items: baseline; gap: 4px; }
.commodity-card .price .value { font-size: 16px; font-weight: 700; font-family: monospace; color: ${theme.text.primary}; }
.commodity-card .price .unit { font-size: 10px; color: ${theme.text.muted}; }

/* Features */
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.feature-card { 
  background: ${theme.bg.secondary}; 
  border: 1px solid ${theme.border.primary}; 
  border-radius: 14px; 
  padding: 26px; 
  transition: all 0.3s;
}
.feature-card:hover { 
  border-color: ${theme.accent.lemon}; 
  transform: translateY(-5px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.3), 0 0 30px ${theme.accent.lemon}10;
}
.feature-card.highlight { 
  background: ${theme.accent.lemon}08; 
  border-color: ${theme.accent.lemon}40;
}
.feature-card .icon { 
  width: 50px; height: 50px; 
  background: ${theme.accent.lemon}15; 
  border: 1px solid ${theme.accent.lemon}30;
  border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
  color: ${theme.accent.lemon}; 
  margin-bottom: 16px;
}
.feature-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 10px; color: ${theme.text.primary}; }
.feature-card p { font-size: 13px; color: ${theme.text.secondary}; line-height: 1.6; }

/* Roadmap */
.roadmap-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.roadmap-item { display: flex; gap: 14px; }
.marker { display: flex; flex-direction: column; align-items: center; }
.dot { 
  width: 14px; height: 14px; 
  background: ${theme.accent.lemon}; 
  border-radius: 50%; 
  box-shadow: 0 0 15px ${theme.accent.lemon}60;
}
.line { 
  width: 2px; flex: 1; 
  background: linear-gradient(to bottom, ${theme.accent.lemon}, ${theme.accent.lemon}20); 
  margin-top: 6px;
}
.content { }
.phase { font-size: 11px; color: ${theme.accent.lemon}; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
.content h3 { font-size: 17px; font-weight: 700; margin: 6px 0 14px; color: ${theme.text.primary}; }
.content ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.content li { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: ${theme.text.secondary}; }
.content li svg { color: ${theme.accent.lemon}; flex-shrink: 0; margin-top: 2px; }

/* CTA */
.cta-section { 
  padding: 80px 20px; 
  background: radial-gradient(ellipse at center, ${theme.accent.lemon}08 0%, transparent 60%);
  position: relative; z-index: 1;
}
.cta-content { max-width: 650px; margin: 0 auto; text-align: center; }
.cta-content h2 { font-size: 38px; font-weight: 800; margin-bottom: 16px; }
.cta-content p { font-size: 15px; color: ${theme.text.secondary}; margin-bottom: 32px; }
.cta-buttons { display: flex; justify-content: center; gap: 14px; margin-bottom: 28px; }
.powered-badge { 
  display: inline-flex; align-items: center; gap: 8px; 
  padding: 12px 22px; 
  background: ${theme.accent.lemon}10; 
  border: 1px solid ${theme.accent.lemon}30; 
  border-radius: 24px; 
  color: ${theme.accent.lemon}; 
  font-size: 13px;
  font-weight: 600;
}

/* Footer */
.footer { 
  background: ${theme.bg.secondary}; 
  border-top: 1px solid ${theme.border.primary}; 
  padding: 50px 20px 24px; 
  position: relative; z-index: 1;
}
.footer-content { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 2fr; gap: 50px; margin-bottom: 32px; }
.footer-brand p { color: ${theme.text.muted}; font-size: 13px; margin-top: 14px; line-height: 1.6; }
.footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.footer-links .col h4 { 
  font-size: 12px; font-weight: 700; 
  color: ${theme.accent.lemon}; 
  text-transform: uppercase; 
  letter-spacing: 1px; 
  margin-bottom: 16px;
}
.footer-links .col a { 
  display: block; 
  color: ${theme.text.muted}; 
  text-decoration: none; 
  font-size: 13px; 
  margin-bottom: 10px;
  transition: all 0.2s;
}
.footer-links .col a:hover { color: ${theme.accent.lemon}; }
.footer-bottom { 
  max-width: 1200px; margin: 0 auto; 
  padding-top: 24px; 
  border-top: 1px solid ${theme.border.primary}; 
  display: flex; justify-content: space-between; align-items: center; 
  font-size: 12px; color: ${theme.text.muted};
}
.footer-bottom .powered { color: ${theme.accent.lemon}; font-weight: 600; }
.footer-bottom a { color: ${theme.accent.lemon}; text-decoration: none; font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* AI CHATBOT STYLES */
/* ═══════════════════════════════════════════════════════════════════════════════ */

.ai-chatbot-container {
  background: ${theme.bg.secondary};
  border-top: 1px solid ${theme.accent.lemon}30;
  display: flex;
  flex-direction: column;
}

.chatbot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, ${theme.accent.lemon}15, ${theme.bg.tertiary});
  border-bottom: 1px solid ${theme.border.primary};
}

.chatbot-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: ${theme.gradient.lemon};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.bg.primary};
  box-shadow: 0 0 15px ${theme.accent.lemon}40;
}

.title-info {
  display: flex;
  flex-direction: column;
}

.title-info .title {
  font-size: 14px;
  font-weight: 700;
  color: ${theme.text.primary};
}

.title-info .subtitle {
  font-size: 11px;
  color: ${theme.accent.lemon};
}

.chatbot-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-trading-toggle button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 6px;
  color: ${theme.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.auto-trading-toggle button:hover {
  border-color: ${theme.accent.lemon}50;
  color: ${theme.accent.lemon};
}

.auto-trading-toggle.active button {
  background: ${theme.accent.lemon}20;
  border-color: ${theme.accent.lemon};
  color: ${theme.accent.lemon};
  box-shadow: 0 0 15px ${theme.accent.lemon}30;
}

.ai-confidence {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: ${theme.accent.green}15;
  border-radius: 4px;
  color: ${theme.accent.green};
  font-size: 11px;
  font-weight: 600;
}

/* AI Predictions Bar */
.ai-predictions-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${theme.bg.tertiary};
  border-bottom: 1px solid ${theme.border.primary};
  overflow-x: auto;
}

.predictions-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.text.muted};
  white-space: nowrap;
}

.predictions-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.prediction-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${theme.bg.secondary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 20px;
  font-size: 11px;
  white-space: nowrap;
}

.prediction-chip .pair {
  font-weight: 600;
  color: ${theme.text.primary};
}

.prediction-chip .direction {
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 700;
}

.prediction-chip .direction.up {
  color: ${theme.chart.up};
}

.prediction-chip .direction.down {
  color: ${theme.chart.down};
}

.prediction-chip .confidence {
  padding: 2px 6px;
  background: ${theme.accent.lemon}20;
  border-radius: 4px;
  color: ${theme.accent.lemon};
  font-weight: 600;
}

.prediction-chip.up {
  border-color: ${theme.chart.up}40;
}

.prediction-chip.down {
  border-color: ${theme.chart.down}40;
}

/* Chat Messages */
.chatbot-messages {
  flex: 1;
  max-height: 250px;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message {
  display: flex;
  gap: 10px;
  max-width: 85%;
}

.chat-message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 28px;
  height: 28px;
  background: ${theme.gradient.lemon};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.bg.primary};
  flex-shrink: 0;
}

.message-content {
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 12px;
  padding: 10px 14px;
}

.chat-message.user .message-content {
  background: ${theme.accent.lemon}15;
  border-color: ${theme.accent.lemon}30;
}

.chat-message.prediction .message-content {
  border-color: ${theme.accent.blue}40;
  background: ${theme.accent.blue}08;
}

.chat-message.signal .message-content {
  border-color: ${theme.accent.orange}40;
  background: ${theme.accent.orange}08;
}

.chat-message.trade .message-content {
  border-color: ${theme.accent.green}40;
  background: ${theme.accent.green}08;
}

.message-text {
  font-size: 13px;
  color: ${theme.text.primary};
  line-height: 1.5;
}

.message-text strong {
  color: ${theme.accent.lemon};
}

.message-time {
  display: block;
  font-size: 10px;
  color: ${theme.text.muted};
  margin-top: 6px;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: ${theme.accent.lemon};
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Chat Input */
.chatbot-input {
  padding: 12px 16px;
  background: ${theme.bg.primary};
  border-top: 1px solid ${theme.border.primary};
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.quick-actions button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 16px;
  color: ${theme.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-actions button:hover {
  border-color: ${theme.accent.lemon}50;
  color: ${theme.accent.lemon};
  background: ${theme.accent.lemon}10;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row input {
  flex: 1;
  padding: 12px 16px;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.secondary};
  border-radius: 8px;
  color: ${theme.text.primary};
  font-size: 13px;
}

.input-row input:focus {
  outline: none;
  border-color: ${theme.accent.lemon};
  box-shadow: 0 0 15px ${theme.accent.lemon}20;
}

.input-row input::placeholder {
  color: ${theme.text.muted};
}

.send-btn {
  width: 44px;
  height: 44px;
  background: ${theme.gradient.lemon};
  border: none;
  border-radius: 8px;
  color: ${theme.bg.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 20px ${theme.accent.lemon}50;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Commodity Icons */
.commodity-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.bg.tertiary};
  border: 1px solid ${theme.border.primary};
  border-radius: 10px;
  flex-shrink: 0;
}

.commodity-icon-wrapper svg {
  width: 32px;
  height: 32px;
}

/* Responsive */
@media (max-width: 1400px) {
  .platform-body { grid-template-columns: 44px 1fr 280px; }
  .dom-ladder { display: none; }
  .currencies-grid { grid-template-columns: repeat(3, 1fr); }
  .commodities-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1200px) {
  .platform-body { grid-template-columns: 1fr; }
  .toolbar-left, .right-panel { display: none; }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-section h1 { font-size: 44px; }
}
@media (max-width: 900px) {
  .hero-section { padding: 60px 16px 40px; }
  .hero-section h1 { font-size: 36px; }
  .hero-stats { gap: 10px; }
  .stat { padding: 14px 16px; min-width: 90px; }
  .stat .value { font-size: 22px; }
  .coming-soon-banner { padding: 8px 18px; gap: 8px; }
  .coming-soon-text { font-size: 12px; letter-spacing: 2px; }
  .coming-soon-banner svg { width: 14px; height: 14px; }
  .hero-badge { font-size: 11px; padding: 8px 14px; }
  .chatbot-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .chatbot-status { width: 100%; justify-content: space-between; }
  .quick-actions { flex-wrap: wrap; }
}
@media (max-width: 768px) {
  .main-nav { display: none; }
  .hero-section h1 { font-size: 28px; line-height: 1.2; }
  .hero-section p { font-size: 14px; }
  .currencies-grid, .commodities-grid { grid-template-columns: 1fr 1fr; }
  .features-grid { grid-template-columns: 1fr; }
  .roadmap-grid { grid-template-columns: 1fr; }
  .footer-content { grid-template-columns: 1fr; }
  .coming-soon-banner { padding: 8px 16px; margin-bottom: 12px; }
  .coming-soon-text { font-size: 11px; letter-spacing: 1.5px; }
  .hero-badge { font-size: 10px; padding: 6px 12px; margin-bottom: 16px; }
  .hero-stats { flex-direction: column; gap: 8px; }
  .stat { width: 100%; max-width: 280px; }
  .hero-actions { flex-direction: column; gap: 10px; }
  .hero-actions button { width: 100%; justify-content: center; }
  .btn-primary, .btn-secondary { padding: 12px 20px; font-size: 13px; }
  .ai-predictions-bar { padding: 8px 12px; }
  .prediction-chip { padding: 5px 10px; font-size: 10px; }
  .chatbot-messages { max-height: 200px; padding: 12px; }
  .message-text { font-size: 12px; }
  .wallet-section { order: -1; }
  .header-right { flex-wrap: wrap; gap: 10px; }
  .connect-wallet-btn { padding: 8px 14px; font-size: 12px; }
  .launch-badge { display: none; }
}
@media (max-width: 480px) {
  .hero-section h1 { font-size: 24px; }
  .coming-soon-text { font-size: 10px; letter-spacing: 1px; }
  .coming-soon-banner svg { width: 12px; height: 12px; }
  .stat .value { font-size: 20px; }
  .stat .label { font-size: 10px; }
  .currencies-grid, .commodities-grid { grid-template-columns: 1fr; }
  .currency-card, .commodity-card { padding: 12px; }
  .section { padding: 40px 12px; }
  .section-header h2 { font-size: 22px; }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// SUBPAGE STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const subpageStyles = `
/* Subpage Container */
.subpage-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #111111 100%);
  color: #e5e5e5;
  font-family: 'Inter', -apple-system, sans-serif;
}

.subpage-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 40px;
  background: rgba(17, 17, 17, 0.95);
  border-bottom: 1px solid rgba(250, 204, 21, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.back-to-main-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.3);
  border-radius: 10px;
  color: #facc15;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-to-main-btn:hover {
  background: rgba(250, 204, 21, 0.2);
  transform: translateX(-3px);
}

.subpage-title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.subpage-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  min-height: calc(100vh - 200px);
}

.subpage-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 40px;
  background: #111111;
  border-top: 1px solid rgba(250, 204, 21, 0.1);
  font-size: 13px;
  color: #6b7280;
}

.footer-back-btn {
  background: transparent;
  border: 1px solid rgba(250, 204, 21, 0.3);
  color: #facc15;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.footer-back-btn:hover {
  background: rgba(250, 204, 21, 0.1);
}

/* Documentation Styles */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.doc-section {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  padding: 28px;
}

.doc-section h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  color: #facc15;
  margin-bottom: 20px;
}

.doc-card {
  background: rgba(17, 17, 17, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 14px;
}

.doc-card h3 {
  font-size: 14px;
  color: #f5f5f5;
  margin-bottom: 8px;
}

.doc-card p {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.6;
}

/* Architecture Diagram */
.architecture-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.arch-layer {
  width: 100%;
  background: rgba(17, 17, 17, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arch-layer.highlight {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.3);
}

.layer-name {
  font-weight: 600;
  color: #f5f5f5;
}

.layer-desc {
  font-size: 12px;
  color: #6b7280;
}

.arch-arrow {
  color: #facc15;
  font-size: 20px;
}

/* Security List */
.security-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.security-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #d1d5db;
  font-size: 14px;
}

.security-list li svg {
  color: #22c55e;
}

/* Smart Contracts Styles */
.contracts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contract-card {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  padding: 24px;
}

.contract-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.contract-icon {
  width: 48px;
  height: 48px;
  background: rgba(250, 204, 21, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc15;
}

.contract-info h3 {
  font-size: 16px;
  color: #f5f5f5;
  margin: 0 0 4px;
}

.contract-address {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6b7280;
}

.contract-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.contract-status.verified {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.contract-card > p {
  color: #9ca3af;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.contract-stats {
  display: flex;
  gap: 30px;
}

.contract-stats .stat {
  display: flex;
  flex-direction: column;
}

.contract-stats .label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
}

.contract-stats .value {
  font-size: 18px;
  font-weight: 700;
  color: #facc15;
}

/* Audit Reports Styles */
.audits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.audit-card {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  padding: 24px;
}

.audit-card.pending {
  opacity: 0.7;
  border-style: dashed;
}

.audit-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.audit-logo {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: #1a1a1a;
}

.audit-info h3 {
  font-size: 15px;
  color: #f5f5f5;
  margin: 0 0 4px;
}

.audit-date {
  font-size: 12px;
  color: #6b7280;
}

.audit-score {
  margin-left: auto;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.audit-score.pending {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
}

.audit-findings {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.finding {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.severity {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
}

.severity.critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.severity.high { background: rgba(249, 115, 22, 0.2); color: #f97316; }
.severity.medium { background: rgba(250, 204, 21, 0.2); color: #facc15; }
.severity.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

.download-audit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.3);
  border-radius: 10px;
  color: #facc15;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.download-audit-btn:hover {
  background: rgba(250, 204, 21, 0.2);
}

.audit-pending-msg {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

/* API Docs Styles */
.api-docs {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 30px;
  min-height: 600px;
}

.api-sidebar {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 100px;
}

.api-sidebar h4 {
  font-size: 11px;
  text-transform: uppercase;
  color: #facc15;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.api-sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.api-sidebar li {
  padding: 10px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #9ca3af;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.api-sidebar li:hover,
.api-sidebar li.active {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
}

.api-content {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  padding: 30px;
}

.api-endpoint h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  margin-bottom: 12px;
}

.method {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.method.get { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.method.post { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.method.delete { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.api-endpoint p {
  color: #9ca3af;
  font-size: 14px;
  margin-bottom: 20px;
}

.code-block {
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #a5f3fc;
  line-height: 1.6;
}

/* Trading Guide Styles */
.guide-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.guide-section h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  color: #facc15;
  margin-bottom: 24px;
}

.order-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.order-type-card {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.order-type-card h4 {
  font-size: 14px;
  color: #f5f5f5;
  margin-bottom: 8px;
}

.order-type-card p {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 10px 0;
  color: #d1d5db;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* FAQ Styles */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-item {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 12px;
  padding: 24px;
}

.faq-item h3 {
  font-size: 15px;
  color: #facc15;
  margin-bottom: 12px;
}

.faq-item p {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.7;
  margin: 0;
}

/* Blog Styles */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.blog-card {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.1);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.blog-card:hover {
  transform: translateY(-4px);
  border-color: rgba(250, 204, 21, 0.3);
}

.blog-image {
  height: 140px;
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.blog-content {
  padding: 20px;
}

.blog-category {
  font-size: 10px;
  text-transform: uppercase;
  color: #facc15;
  font-weight: 700;
  letter-spacing: 1px;
}

.blog-card h3 {
  font-size: 15px;
  color: #f5f5f5;
  margin: 10px 0;
  line-height: 1.4;
}

.blog-date {
  font-size: 12px;
  color: #6b7280;
}

/* Legal Content Styles */
.legal-content {
  max-width: 800px;
}

.last-updated {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 30px;
}

.legal-content section {
  margin-bottom: 32px;
}

.legal-content h2 {
  font-size: 18px;
  color: #facc15;
  margin-bottom: 12px;
}

.legal-content h3 {
  font-size: 15px;
  color: #f5f5f5;
  margin-bottom: 10px;
}

.legal-content p {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.7;
}

/* Risk Disclosure Special */
.risk-disclosure .risk-warning {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 30px;
}

.risk-warning svg {
  color: #ef4444;
}

.risk-warning h2 {
  color: #ef4444;
  margin: 0;
  font-size: 16px;
}

/* Responsive Subpages */
@media (max-width: 768px) {
  .subpage-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .subpage-content {
    padding: 24px 16px;
  }
  
  .docs-grid {
    grid-template-columns: 1fr;
  }
  
  .api-docs {
    grid-template-columns: 1fr;
  }
  
  .api-sidebar {
    position: static;
  }
  
  .contract-header {
    flex-wrap: wrap;
  }
  
  .contract-status {
    margin-left: 0;
    margin-top: 12px;
  }
  
  .audit-findings {
    flex-wrap: wrap;
  }
}
`;

export default FxDefiPage;
