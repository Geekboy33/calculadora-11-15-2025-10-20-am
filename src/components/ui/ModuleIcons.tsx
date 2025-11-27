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

