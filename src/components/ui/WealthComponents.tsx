/**
 * DAES Wealth Components
 * Componentes estilo Emirates NBD Wealth Management
 * Nivel: Institucional Premium
 */

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// WEALTH CARD - Card estilo Emirates NBD
// ═══════════════════════════════════════════════════════════════

interface WealthCardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function WealthCard({ children, className = '', elevated = false }: WealthCardProps) {
  return (
    <div className={`
      bg-[var(--bg-card)] 
      rounded-[var(--radius-2xl)] 
      ${elevated ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-card)]'}
      transition-all duration-[var(--transition-base)]
      hover:shadow-[var(--shadow-elevated)]
      ${className}
    `}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH STAT - Número grande estilo portfolio
// ═══════════════════════════════════════════════════════════════

interface WealthStatProps {
  label: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon?: LucideIcon;
  currency?: string;
}

export function WealthStat({ label, value, change, icon: Icon, currency }: WealthStatProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[var(--text-muted)] text-[var(--text-sm)] font-[var(--font-medium)] uppercase tracking-wider">
          {label}
        </p>
        {Icon && <Icon className="w-5 h-5 text-[var(--text-muted)]" />}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-[var(--text-primary)] text-[var(--text-4xl)] font-[var(--font-bold)] tracking-tight">
          {value}
        </p>
        {currency && (
          <span className="text-[var(--text-secondary)] text-[var(--text-lg)] font-[var(--font-medium)]">
            {currency}
          </span>
        )}
      </div>
      {change && (
        <div className={`flex items-center gap-1 mt-2 text-[var(--text-sm)] font-[var(--font-semibold)] ${
          change.positive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'
        }`}>
          <span>{change.positive ? '▲' : '▼'}</span>
          <span>{Math.abs(change.value)}%</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH TAB - Tabs estilo Overview/Markets
// ═══════════════════════════════════════════════════════════════

interface WealthTabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export function WealthTabs({ tabs, activeTab, onChange }: WealthTabsProps) {
  return (
    <div className="flex gap-2 bg-[var(--bg-subtle)] rounded-[var(--radius-xl)] p-1">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`
            px-6 py-3 rounded-[var(--radius-lg)] font-[var(--font-semibold)] text-[var(--text-sm)]
            transition-all duration-[var(--transition-base)]
            ${activeTab === tab
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH BUTTON - Botón estilo wealth management
// ═══════════════════════════════════════════════════════════════

interface WealthButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function WealthButton({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  onClick, 
  disabled,
  className = ''
}: WealthButtonProps) {
  const variants = {
    primary: 'bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary-hover)] shadow-md',
    secondary: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-[var(--radius-lg)] font-[var(--font-semibold)] text-[var(--text-sm)]
        flex items-center gap-2 transition-all duration-[var(--transition-base)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH BADGE - Badge de estado
// ═══════════════════════════════════════════════════════════════

interface WealthBadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
}

export function WealthBadge({ children, variant = 'info' }: WealthBadgeProps) {
  const variants = {
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
    error: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border-[var(--status-error-border)]',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]'
  };

  return (
    <span className={`
      px-3 py-1 rounded-[var(--radius-full)] text-[var(--text-xs)] font-[var(--font-semibold)]
      border inline-flex items-center gap-1
      ${variants[variant]}
    `}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH HEADER - Header estilo Emirates NBD
// ═══════════════════════════════════════════════════════════════

interface WealthHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function WealthHeader({ title, subtitle, actions }: WealthHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-[var(--text-primary)] text-[var(--text-4xl)] font-[var(--font-bold)] tracking-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[var(--text-secondary)] text-[var(--text-base)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEALTH INPUT - Input estilo wealth
// ═══════════════════════════════════════════════════════════════

interface WealthInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}

export function WealthInput({ label, value, onChange, type = 'text', placeholder, error }: WealthInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[var(--text-secondary)] text-[var(--text-sm)] font-[var(--font-medium)]">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 rounded-[var(--radius-lg)]
          bg-[var(--bg-card)] border
          ${error ? 'border-[var(--color-accent-red)]' : 'border-[var(--border-subtle)]'}
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--color-primary)]/20
          transition-all duration-[var(--transition-base)]
        `}
      />
      {error && (
        <p className="text-[var(--color-accent-red)] text-[var(--text-xs)]">{error}</p>
      )}
    </div>
  );
}

