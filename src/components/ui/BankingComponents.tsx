/**
 * Banking UI Components - Sistema Uniforme de Diseño Bancario
 * Componentes reutilizables para toda la plataforma
 * Nivel: JP Morgan / Goldman Sachs / Revolut Business
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/design-system';

// ═══════════════════════════════════════════════════════════════
// BANKING CARD - Card Profesional Bancaria
// ═══════════════════════════════════════════════════════════════

interface BankingCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'interactive';
  className?: string;
}

export function BankingCard({ children, variant = 'default', className }: BankingCardProps) {
  const baseClasses = 'bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-elevated)] to-[var(--bg-card)] rounded-2xl transition-all';
  
  const variantClasses = {
    default: 'card-base',
    elevated: 'card-elevated',
    interactive: 'card-interactive hover-card'
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING HEADER - Header Profesional
// ═══════════════════════════════════════════════════════════════

interface BankingHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  gradient?: 'sky' | 'emerald' | 'amber' | 'purple';
}

export function BankingHeader({ icon: Icon, title, subtitle, actions, gradient = 'white' }: BankingHeaderProps & { gradient?: 'white' | 'emerald' | 'amber' | 'purple' }) {
  const gradientClasses = {
    white: 'from-white to-white',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <BankingCard className="p-card m-section">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-section">
        <div className="flex items-center gap-card">
          <div className={cn('p-4 rounded-xl bg-gradient-to-br', gradientClasses[gradient])} aria-hidden="true">
            <Icon className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-heading">{title}</h1>
            {subtitle && <p className="text-secondary mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-card" role="toolbar">{actions}</div>}
      </div>
    </BankingCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING BUTTON - Botones Profesionales
// ═══════════════════════════════════════════════════════════════

interface BankingButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function BankingButton({ children, onClick, variant = 'primary', icon: Icon, disabled, className, ...props }: BankingButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = 'px-card py-card-sm rounded-xl font-semibold transition-all flex items-center gap-card-sm min-h-[48px]';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-white to-white hover:from-white hover:to-white text-black shadow-lg hover:shadow-white/20 hover-lift',
    secondary: 'bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:border-[var(--border-focus)] text-[var(--text-primary)] hover-lift',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover-text',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover-lift'
  };

  // Mouse tracking para efecto visual
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    button.style.setProperty('--mouse-x', `${x}%`);
    button.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      className={cn(
        baseClasses, 
        variantClasses[variant], 
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'ripple-effect btn-interactive',
        className
      )}
      aria-disabled={disabled}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING METRIC - Métricas Profesionales
// ═══════════════════════════════════════════════════════════════

interface BankingMetricProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: 'sky' | 'emerald' | 'amber' | 'purple';
}

export function BankingMetric({ label, value, icon: Icon, trend, color = 'white' }: BankingMetricProps & { color?: 'white' | 'emerald' | 'amber' | 'purple' }) {
  const colorClasses = {
    white: 'bg-white/10 text-black',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400'
  };

  return (
    <BankingCard className="p-card">
      <div className="flex items-start justify-between m-card">
        <div>
          <p className="text-muted text-sm font-semibold uppercase tracking-wider mb-2">{label}</p>
          <p className="text-4xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])} aria-hidden="true">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className={cn('text-sm font-semibold', trend.positive ? 'text-emerald-400' : 'text-red-400')} aria-label={`Trend: ${trend.positive ? 'up' : 'down'} ${Math.abs(trend.value)}%`}>
          {trend.positive ? '↗' : '↘'} {Math.abs(trend.value)}%
        </div>
      )}
    </BankingCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING BADGE - Badges Profesionales
// ═══════════════════════════════════════════════════════════════

interface BankingBadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  icon?: LucideIcon;
}

export function BankingBadge({ children, variant = 'info', icon: Icon }: BankingBadgeProps) {
  const variantClasses = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-sky-500/10 border-sky-500/30 text-sky-400'
  };

  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1', variantClasses[variant])}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING STATUS DOT - Indicadores de Estado
// ═══════════════════════════════════════════════════════════════

interface BankingStatusDotProps {
  status: 'active' | 'inactive' | 'warning' | 'error';
}

export function BankingStatusDot({ status }: BankingStatusDotProps) {
  const statusClasses = {
    active: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse',
    inactive: 'bg-[var(--bg-active)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse',
    error: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
  };

  return <div className={cn('w-2 h-2 rounded-full', statusClasses[status])} />;
}

// ═══════════════════════════════════════════════════════════════
// BANKING SECTION - Sección con Header
// ═══════════════════════════════════════════════════════════════

interface BankingSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  color?: 'sky' | 'emerald' | 'amber' | 'purple';
}

export function BankingSection({ title, icon: Icon, children, actions, color = 'sky' }: BankingSectionProps) {
  const colorClasses = {
    sky: 'text-sky-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400'
  };

  return (
    <BankingCard>
      <div className="p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Icon className={cn('w-6 h-6', colorClasses[color])} />
            {title}
          </h2>
          {actions}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </BankingCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING INPUT - Inputs Profesionales
// ═══════════════════════════════════════════════════════════════

interface BankingInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'password' | 'email';
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function BankingInput({ label, value, onChange, type = 'text', placeholder, error, required }: BankingInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-[var(--bg-card)] border rounded-xl px-4 py-3 text-[var(--text-primary)]',
          'focus:outline-none focus:ring-2 transition-all',
          error 
            ? 'border-red-500/50 focus:ring-red-500/30' 
            : 'border-[var(--border-subtle)] focus:border-sky-500 focus:ring-sky-500/30'
        )}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING SELECT - Selector Profesional
// ═══════════════════════════════════════════════════════════════

interface BankingSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}

export function BankingSelect({ label, value, onChange, options, required }: BankingSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-sky-500 rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING EMPTY STATE - Estado Vacío Profesional
// ═══════════════════════════════════════════════════════════════

interface BankingEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function BankingEmptyState({ icon: Icon, title, description, action }: BankingEmptyStateProps) {
  return (
    <div className="text-center py-20">
      <Icon className="w-20 h-20 text-slate-700 mx-auto mb-4" />
      <p className="text-[var(--text-secondary)] text-lg font-medium mb-2">{title}</p>
      {description && <p className="text-[var(--text-muted)] text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANKING LOADING - Loading State Profesional
// ═══════════════════════════════════════════════════════════════

interface BankingLoadingProps {
  message?: string;
}

export function BankingLoading({ message = 'Loading...' }: BankingLoadingProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[var(--text-secondary)] text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}

