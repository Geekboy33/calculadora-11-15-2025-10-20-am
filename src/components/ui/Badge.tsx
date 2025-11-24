/**
 * Professional Badge Component
 * Tags y badges para estados, categorías, etc.
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon: Icon,
  pulse = false,
  children,
  className = '',
}: BadgeProps) {
  const variants = {
    success: `
      bg-[#00ff88]/20 
      border-[#00ff88]/40 
      text-[#00ff88]
      shadow-sm shadow-[#00ff88]/20
    `,
    
    warning: `
      bg-amber-500/20 
      border-amber-500/40 
      text-amber-300
      shadow-sm shadow-amber-500/20
    `,
    
    error: `
      bg-red-500/20 
      border-red-500/40 
      text-red-300
      shadow-sm shadow-red-500/20
    `,
    
    info: `
      bg-blue-500/20 
      border-blue-500/40 
      text-blue-300
      shadow-sm shadow-blue-500/20
    `,
    
    primary: `
      bg-[#00ff88]/20 
      border-[#00ff88]/40 
      text-[#00ff88]
      shadow-sm shadow-[#00ff88]/20
    `,
    
    default: `
      bg-white/10 
      border-white/20 
      text-white/80
      shadow-sm shadow-black/20
    `,
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center
        border-2 rounded-full font-semibold uppercase tracking-wider
        ${variants[variant]}
        ${sizes[size]}
        transition-all duration-200
        hover:scale-105
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      {children}
    </span>
  );
}

/**
 * Status Badge con indicador de pulso
 */
export function StatusBadge({
  status,
  label,
  pulsing = false,
}: {
  status: 'active' | 'inactive' | 'processing' | 'error' | 'pending';
  label?: string;
  pulsing?: boolean;
}) {
  const statusConfig = {
    active: { variant: 'success' as const, label: label || 'ACTIVE' },
    inactive: { variant: 'default' as const, label: label || 'INACTIVE' },
    processing: { variant: 'info' as const, label: label || 'PROCESSING' },
    error: { variant: 'error' as const, label: label || 'ERROR' },
    pending: { variant: 'warning' as const, label: label || 'PENDING' },
  };

  const config = statusConfig[status];

  return (
    <div className="relative inline-flex items-center gap-2">
      {pulsing && (
        <div className="relative">
          <div className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${
            status === 'active' ? 'bg-[#00ff88]' :
            status === 'processing' ? 'bg-blue-500' :
            status === 'error' ? 'bg-red-500' :
            status === 'pending' ? 'bg-amber-500' :
            'bg-white/50'
          } opacity-75`} />
          <div className={`relative w-2 h-2 rounded-full ${
            status === 'active' ? 'bg-[#00ff88]' :
            status === 'processing' ? 'bg-blue-500' :
            status === 'error' ? 'bg-red-500' :
            status === 'pending' ? 'bg-amber-500' :
            'bg-white/50'
          }`} />
        </div>
      )}
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    </div>
  );
}

export default Badge;

