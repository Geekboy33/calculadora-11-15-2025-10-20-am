/**
 * Module Icons - Iconos Futuristas Minimalistas
 * Diseño: Líneas finas, formas simples, estilo futurista
 */

import React from 'react';

interface ModuleIconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CENTRAL PANEL ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function CentralPanelIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="6" width="14" height="14" rx="1" 
        fill="none" 
        stroke="#000000" 
        strokeWidth="2"
      />
      <line x1="9" y1="10" x2="15" y2="10" stroke="#000000" strokeWidth="1.5" />
      <line x1="9" y1="13" x2="15" y2="13" stroke="#000000" strokeWidth="1.5" />
      <line x1="9" y1="16" x2="13" y2="16" stroke="#000000" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="1.5" fill="#000000" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TREASURY RESERVE ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function PrivateCentralBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill="none"
        stroke="#000000" 
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2" fill="none" stroke="#000000" strokeWidth="2" />
      <line x1="12" y1="6" x2="12" y2="14" stroke="#000000" strokeWidth="1.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SOURCE OF FUNDS ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function SourceOfFundsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10" cy="10" r="6" fill="none" stroke="#000000" strokeWidth="2" />
      <line x1="15" y1="15" x2="20" y2="20" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="6" x2="10" y2="14" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="10" x2="13" y2="10" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// THE KINGDOM BANK ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function TheKingdomBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 16 L5 20 L19 20 L19 16 L12 8 Z" fill="none" stroke="#000000" strokeWidth="2" />
      <path d="M12 8 L8 12 L10 12 L12 8 L14 12 L16 12 Z" fill="none" stroke="#000000" strokeWidth="2" />
      <circle cx="8" cy="12" r="1" fill="#000000" />
      <circle cx="12" cy="10" r="1" fill="#000000" />
      <circle cx="16" cy="12" r="1" fill="#000000" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// DAES PARTNER API ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function DAESPartnerAPIIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="#000000" strokeWidth="2" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="#000000" strokeWidth="1.5" />
      <ellipse cx="12" cy="8" rx="6" ry="1.5" fill="none" stroke="#000000" strokeWidth="1.5" />
      <ellipse cx="12" cy="16" rx="6" ry="1.5" fill="none" stroke="#000000" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="#000000" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function DashboardIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function AnalyticsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 18 L8 12 L12 16 L21 6" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="3" cy="18" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
      <circle cx="8" cy="12" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
      <circle cx="12" cy="16" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
      <circle cx="21" cy="6" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEDGER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function LedgerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="18" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="16" x2="14" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BLACKSCREEN ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function BlackScreenIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="1" fill="#000000" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="0.5" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="12" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTODY ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function CustodyIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="4" width="12" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <circle cx="12" cy="10" r="1.5" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="16" x2="16" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILES ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function ProfilesIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <path d="M6 20 C6 16 8.5 14 12 14 C15.5 14 18 16 18 20" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API DAES ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function APIDAESIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="4" r="1" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API GLOBAL ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function APIGlobalIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <ellipse cx="12" cy="8" rx="6" ry="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <ellipse cx="12" cy="16" rx="6" ry="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API DIGITAL ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function APIDigitalIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="7" y="7" width="10" height="10" rx="0.5" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.5" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API VUSD ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function APIVUSDIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <line x1="12" y1="4" x2="12" y2="6" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROOF OF RESERVES ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function ProofOfReservesIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill="none"
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5"
      />
      <path d="M9 12 L11 14 L15 10" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS EVENTS ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function TransactionsEventsIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <circle cx="8" cy="10" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="12" cy="10" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="16" cy="10" r="1" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <line x1="6" y1="14" x2="18" y2="14" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="6" y1="17" x2="14" y2="17" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANK SETTLEMENT ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function BankSettlementIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M8 14 L12 18 L16 14" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// IBAN MANAGER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function IBANManagerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="6" y1="9" x2="18" y2="9" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="6" y1="13" x2="14" y2="13" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="6" y1="17" x2="16" y2="17" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CORE BANKING API ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function CoreBankingAPIIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2 L20 5 L20 11 C20 16 15 20 12 22 C9 20 4 16 4 11 L4 5 Z"
        fill="none"
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5"
      />
      <path d="M8 12 L12 16 L16 12 M12 8 L12 16" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        fill="none"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDIT BANK ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function AuditBankIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="16" x2="12" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <circle cx="18" cy="6" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROCESSOR ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function ProcessorIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <rect x="7" y="7" width="10" height="10" rx="0.5" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <circle cx="10" cy="10" r="0.8" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="14" cy="10" r="0.8" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="10" cy="14" r="0.8" fill={active ? '#4F8DFF' : '#1A4DB3'} />
      <circle cx="14" cy="14" r="0.8" fill={active ? '#4F8DFF' : '#1A4DB3'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function TransferIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 16 L1 12 L7 8 M1 12 L23 12" 
        stroke={active ? '#4F8DFF' : '#1A4DB3'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path d="M17 8 L23 12 L17 16" 
        stroke={active ? '#FFFFFF' : '#FFFFFF'} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// API KEYS ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function APIKeysIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="8" y="6" width="8" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <circle cx="12" cy="10" r="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="12" y1="12" x2="12" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="12" x2="8" y2="12" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="20" y2="12" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BINARY READER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function BinaryReaderIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="16" x2="12" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEX VIEWER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function HexViewerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="16" x2="14" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// LARGE FILE ANALYZER ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function LargeFileAnalyzerIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="4" width="14" height="16" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <line x1="8" y1="16" x2="12" y2="16" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1" />
      <circle cx="18" cy="6" r="1.5" fill={active ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// XCP B2B ICON - Futurista Minimalista
// ═══════════════════════════════════════════════════════════════

export function XcpB2BIcon({ size = 24, className = '', active = false }: ModuleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" />
      <path d="M8 10 L12 14 L16 10" stroke={active ? '#4F8DFF' : '#1A4DB3'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M8 14 L12 18 L16 14" stroke={active ? '#FFFFFF' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
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
// MODULE ICON WRAPPER (Widget Futurista Minimalista)
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
          ? 'bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-500/30 shadow-lg shadow-sky-500/10' 
          : 'bg-slate-900/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/30'
        }
        group
      `}
      style={{
        minWidth: '100px',
        minHeight: '90px',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Icon container - Minimalista */}
      <div className={`
        relative p-2 rounded-lg
        transition-all duration-300
        ${active 
          ? 'bg-sky-500/5' 
          : 'bg-transparent group-hover:bg-slate-800/30'
        }
      `}>
        <div className={active ? 'scale-105' : 'group-hover:scale-105 transition-transform'}>
          {icon}
        </div>
        {/* Active indicator - Minimalista */}
        {active && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-950" />
        )}
      </div>
      
      {/* Label - Minimalista */}
      <span className={`
        text-xs font-medium text-center
        transition-colors duration-300
        ${active ? 'text-white' : 'text-white group-hover:text-white'}
      `}>
        {label}
      </span>
      
      {/* Hover glow effect - Sutil */}
      {!active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500/0 to-blue-600/0 group-hover:from-sky-500/3 group-hover:to-blue-600/3 transition-all duration-300 pointer-events-none" />
      )}
    </button>
  );
}
