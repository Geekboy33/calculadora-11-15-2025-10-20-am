/**
 * Module Icons - Iconos personalizados para módulos DAES
 * Diseño propio estilo Emirates NBD Wealth
 */

import React from 'react';

interface ModuleIconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CENTRAL PANEL ICON
// ═══════════════════════════════════════════════════════════════

export function CentralPanelIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Building base */}
      <rect x="4" y="8" width="16" height="12" rx="2" 
        fill={active ? '#4F8DFF' : '#1A4DB3'} 
        stroke={active ? '#6BA3FF' : '#003B7C'} 
        strokeWidth="1.5"
      />
      {/* Windows grid */}
      <rect x="6" y="10" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="11" y="10" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="16" y="10" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="6" y="15" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="11" y="15" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="16" y="15" width="3" height="3" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      {/* Top accent */}
      <path d="M8 4 L12 2 L16 4" 
        stroke={active ? '#6BA3FF' : '#1A4DB3'} 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRIVATE CENTRAL BANK ICON
// ═══════════════════════════════════════════════════════════════

export function PrivateCentralBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Shield base */}
      <path
        d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill={active ? '#4F8DFF' : '#1A4DB3'}
        stroke={active ? '#6BA3FF' : '#003B7C'}
        strokeWidth="1.5"
      />
      {/* Shield pattern */}
      <circle cx="12" cy="10" r="2" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <path d="M12 6 L12 14 M8 10 L16 10" 
        stroke={active ? '#FFFFFF' : '#EEF4FF'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SOURCE OF FUNDS ICON
// ═══════════════════════════════════════════════════════════════

export function SourceOfFundsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Magnifying glass */}
      <circle cx="10" cy="10" r="6" 
        fill="none" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="2"
      />
      <path d="M15 15 L20 20" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      {/* Money symbol inside */}
      <path d="M10 6 L10 14 M7 10 L13 10" 
        stroke={active ? '#6EE7B7' : '#59C27A'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// THE KINGDOM BANK ICON
// ═══════════════════════════════════════════════════════════════

export function TheKingdomBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: active ? 'drop-shadow(0 0 8px rgba(245, 213, 118, 0.6))' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Crown base */}
      <path
        d="M5 16 L5 20 L19 20 L19 16 L12 8 Z"
        fill={active ? '#F5D576' : '#C8A56A'}
        stroke={active ? '#FBBF24' : '#A67C52'}
        strokeWidth="1.5"
      />
      {/* Crown peaks */}
      <path d="M12 8 L8 12 L10 12 L12 8 L14 12 L16 12 Z" 
        fill={active ? '#FBBF24' : '#A67C52'}
      />
      {/* Gems */}
      <circle cx="8" cy="12" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="12" cy="10" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="16" cy="12" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// DAES PARTNER API ICON
// ═══════════════════════════════════════════════════════════════

export function DAESPartnerAPIIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Globe */}
      <circle cx="12" cy="12" r="8" 
        fill="none" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="2"
      />
      {/* Latitude lines */}
      <path d="M4 12 L20 12" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5"
      />
      <ellipse cx="12" cy="8" rx="6" ry="2" 
        fill="none" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5"
      />
      <ellipse cx="12" cy="16" rx="6" ry="2" 
        fill="none" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5"
      />
      {/* Connection nodes */}
      <circle cx="8" cy="10" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="16" cy="10" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="8" cy="14" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="16" cy="14" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="12" cy="12" r="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD ICON
// ═══════════════════════════════════════════════════════════════

export function DashboardIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ICON
// ═══════════════════════════════════════════════════════════════

export function AnalyticsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <path d="M3 18 L8 12 L12 16 L21 6" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="3" cy="18" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="8" cy="12" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="12" cy="16" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
      <circle cx="21" cy="6" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEDGER ICON
// ═══════════════════════════════════════════════════════════════

export function LedgerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="18" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" />
      <line x1="8" y1="16" x2="14" y2="16" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BLACKSCREEN ICON
// ═══════════════════════════════════════════════════════════════

export function BlackScreenIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.8))' : 'none' }}>
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#000000" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="1" fill={active ? '#4F8DFF' : '#1A4DB3'} opacity="0.3" />
      <circle cx="12" cy="12" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTODY ICON
// ═══════════════════════════════════════════════════════════════

export function CustodyIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="6" y="4" width="12" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <path d="M8 16 L16 16" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILES ICON
// ═══════════════════════════════════════════════════════════════

export function ProfilesIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <circle cx="12" cy="8" r="4" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M6 20 C6 16 8.5 14 12 14 C15.5 14 18 16 18 20" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API DAES ICON
// ═══════════════════════════════════════════════════════════════

export function APIDAESIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="6" width="16" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="4" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API GLOBAL ICON
// ═══════════════════════════════════════════════════════════════

export function APIGlobalIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <circle cx="12" cy="12" r="8" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="2" />
      <path d="M4 12 L20 12 M12 4 L12 20" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API DIGITAL ICON
// ═══════════════════════════════════════════════════════════════

export function APIDigitalIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <rect x="7" y="7" width="10" height="10" rx="1" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="12" cy="12" r="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API VUSD ICON
// ═══════════════════════════════════════════════════════════════

export function APIVUSDIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="6" width="16" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M12 4 L12 6" stroke={active ? '#6EE7B7' : '#59C27A'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROOF OF RESERVES ICON
// ═══════════════════════════════════════════════════════════════

export function ProofOfReservesIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <path d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <path d="M9 12 L11 14 L15 10" stroke={active ? '#6EE7B7' : '#59C27A'} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS EVENTS ICON
// ═══════════════════════════════════════════════════════════════

export function TransactionsEventsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="8" cy="10" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="12" cy="10" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="16" cy="10" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <path d="M6 14 L18 14" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" />
      <path d="M6 17 L14 17" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANK SETTLEMENT ICON
// ═══════════════════════════════════════════════════════════════

export function BankSettlementIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="6" width="16" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M8 14 L12 18 L16 14" stroke={active ? '#6EE7B7' : '#59C27A'} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// IBAN MANAGER ICON
// ═══════════════════════════════════════════════════════════════

export function IBANManagerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="6" width="16" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <rect x="6" y="9" width="12" height="2" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="6" y="13" width="8" height="2" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <rect x="6" y="17" width="10" height="2" rx="0.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CORE BANKING API ICON
// ═══════════════════════════════════════════════════════════════

export function CoreBankingAPIIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <path d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill={active ? '#4F8DFF' : '#1A4DB3'} stroke={active ? '#6BA3FF' : '#003B7C'} strokeWidth="1.5" />
      <path d="M8 12 L12 16 L16 12 M12 8 L12 16" 
        stroke={active ? '#FFFFFF' : '#EEF4FF'} 
        strokeWidth="2" 
        strokeLinecap="round" 
        fill="none"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDIT BANK ICON
// ═══════════════════════════════════════════════════════════════

export function AuditBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L12 16" 
        stroke={active ? '#FFFFFF' : '#EEF4FF'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <circle cx="18" cy="6" r="2" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROCESSOR ICON
// ═══════════════════════════════════════════════════════════════

export function ProcessorIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <rect x="7" y="7" width="10" height="10" rx="1" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <circle cx="10" cy="10" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="14" cy="10" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="10" cy="14" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="14" cy="14" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER ICON
// ═══════════════════════════════════════════════════════════════

export function TransferIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <path d="M7 16 L1 12 L7 8 M1 12 L23 12" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path d="M17 8 L23 12 L17 16" 
        stroke={active ? '#6EE7B7' : '#59C27A'} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API KEYS ICON
// ═══════════════════════════════════════════════════════════════

export function APIKeysIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="8" y="6" width="8" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="12" cy="10" r="1.5" fill={active ? '#FFFFFF' : '#EEF4FF'} />
      <path d="M12 12 L12 16" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 12 L8 12 M16 12 L20 12" 
        stroke={active ? '#6EE7B7' : '#59C27A'} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BINARY READER ICON
// ═══════════════════════════════════════════════════════════════

export function BinaryReaderIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <text x="12" y="14" fontSize="8" fill={active ? '#FFFFFF' : '#EEF4FF'} textAnchor="middle" fontFamily="monospace">01</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEX VIEWER ICON
// ═══════════════════════════════════════════════════════════════

export function HexViewerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <text x="12" y="14" fontSize="7" fill={active ? '#FFFFFF' : '#EEF4FF'} textAnchor="middle" fontFamily="monospace">0xFF</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// LARGE FILE ANALYZER ICON
// ═══════════════════════════════════════════════════════════════

export function LargeFileAnalyzerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="5" y="4" width="14" height="16" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L12 16" 
        stroke={active ? '#FFFFFF' : '#EEF4FF'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <circle cx="18" cy="6" r="1.5" fill={active ? '#6EE7B7' : '#59C27A'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// XCP B2B ICON
// ═══════════════════════════════════════════════════════════════

export function XcpB2BIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ filter: active ? 'drop-shadow(0 0 8px rgba(79, 141, 255, 0.6))' : 'none' }}>
      <rect x="4" y="6" width="16" height="12" rx="2" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#FFFFFF' : '#EEF4FF'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M8 14 L12 18 L16 14" stroke={active ? '#6EE7B7' : '#59C27A'} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Icon by Tab ID
// ═══════════════════════════════════════════════════════════════

export function getModuleIcon(tabId: string, size: number = 20, active: boolean = false): React.ReactNode {
  const props = { size, active, className: '' };
  
  switch (tabId) {
    case 'central-dashboard':
      return <CentralPanelIcon {...props} />;
    case 'banco-central-privado':
      return <PrivateCentralBankIcon {...props} />;
    case 'origen-fondos':
      return <SourceOfFundsIcon {...props} />;
    case 'the-kingdom-bank':
      return <TheKingdomBankIcon {...props} />;
    case 'daes-partner-api':
      return <DAESPartnerAPIIcon {...props} />;
    case 'dashboard':
      return <DashboardIcon {...props} />;
    case 'analytics':
      return <AnalyticsIcon {...props} />;
    case 'ledger':
      return <LedgerIcon {...props} />;
    case 'blackscreen':
      return <BlackScreenIcon {...props} />;
    case 'custody':
      return <CustodyIcon {...props} />;
    case 'profiles':
      return <ProfilesIcon {...props} />;
    case 'api-daes':
    case 'api-vusd':
    case 'api-vusd1':
      return <APIDAESIcon {...props} />;
    case 'api-global':
      return <APIGlobalIcon {...props} />;
    case 'api-digital':
      return <APIDigitalIcon {...props} />;
    case 'proof-of-reserves':
    case 'proof-of-reserves-api1':
      return <ProofOfReservesIcon {...props} />;
    case 'transactions-events':
      return <TransactionsEventsIcon {...props} />;
    case 'bank-settlement':
      return <BankSettlementIcon {...props} />;
    case 'iban-manager':
      return <IBANManagerIcon {...props} />;
    case 'corebanking-api':
      return <CoreBankingAPIIcon {...props} />;
    case 'audit-bank':
      return <AuditBankIcon {...props} />;
    case 'processor':
      return <ProcessorIcon {...props} />;
    case 'transfer':
      return <TransferIcon {...props} />;
    case 'api-keys':
      return <APIKeysIcon {...props} />;
    case 'binary-reader':
      return <BinaryReaderIcon {...props} />;
    case 'hex-viewer':
      return <HexViewerIcon {...props} />;
    case 'large-file-analyzer':
      return <LargeFileAnalyzerIcon {...props} />;
    case 'xcp-b2b':
      return <XcpB2BIcon {...props} />;
    case 'api-daes-pledge':
      return <APIVUSDIcon {...props} />;
    default:
      return <CentralPanelIcon {...props} />;
  }
}

// ═══════════════════════════════════════════════════════════════
// MODULE ICON WRAPPER (Widget con diseño premium)
// ═══════════════════════════════════════════════════════════════

interface ModuleIconWidgetProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function ModuleIconWidget({ icon, label, active = false, onClick }: ModuleIconWidgetProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-2
        px-4 py-3 rounded-xl
        transition-all duration-300
        ${active 
          ? 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-2 border-sky-500/50 shadow-lg shadow-sky-500/20' 
          : 'bg-slate-900/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
        }
        group
      `}
      style={{
        minWidth: '100px',
        minHeight: '90px'
      }}
    >
      {/* Icon container with glow effect */}
      <div className={`
        relative p-3 rounded-lg
        transition-all duration-300
        ${active 
          ? 'bg-gradient-to-br from-sky-500/30 to-blue-600/30' 
          : 'bg-slate-800/50 group-hover:bg-slate-700/50'
        }
      `}>
        <div className={active ? 'scale-110' : 'group-hover:scale-105 transition-transform'}>
          {icon}
        </div>
        {/* Active indicator */}
        {active && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-lg" />
        )}
      </div>
      
      {/* Label */}
      <span className={`
        text-xs font-semibold text-center
        transition-colors duration-300
        ${active ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'}
      `}>
        {label}
      </span>
      
      {/* Hover glow effect */}
      {!active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500/0 to-blue-600/0 group-hover:from-sky-500/5 group-hover:to-blue-600/5 transition-all duration-300 pointer-events-none" />
      )}
    </button>
  );
}

