/**
 * Professional Banking Design System
 * Sistema de diseño de nivel bancario profesional
 */

export const BankingDesignTokens = {
  // Colors - Paleta profesional conservadora
  colors: {
    // Base Colors (Dark Theme)
    slate: {
      950: '#020617',
      900: '#0F172A',
      800: '#1E293B',
      700: '#334155',
      600: '#475569',
      500: '#64748B',
      400: '#94A3B8',
      300: '#CBD5E1',
      200: '#E2E8F0',
      100: '#F1F5F9',
      50: '#F8FAFC'
    },
    
    // Accent Colors
    sky: {
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1'
    },
    
    emerald: {
      500: '#10B981',
      600: '#059669',
      700: '#047857'
    },
    
    amber: {
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309'
    },
    
    red: {
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C'
    }
  },

  // Typography - Sistema tipográfico bancario
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem'    // 60px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900
    }
  },

  // Spacing - Sistema de 8px
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem'      // 96px
  },

  // Shadows - Elevaciones profesionales
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    // Banking Specific Shadows (con color)
    sky: '0 10px 40px -10px rgba(14, 165, 233, 0.25)',
    emerald: '0 10px 40px -10px rgba(16, 185, 129, 0.25)',
    amber: '0 10px 40px -10px rgba(245, 158, 11, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  // Border Radius - Consistencia en esquinas
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    full: '9999px'
  },

  // Transitions - Velocidades profesionales
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

/**
 * Clases CSS pre-construidas para uso rápido
 */
export const BankingStyles = {
  // Cards profesionales
  card: {
    base: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-xl',
    elevated: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-600 rounded-2xl shadow-2xl',
    interactive: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-xl hover:border-slate-600 hover:shadow-sky transition-all cursor-pointer'
  },

  // Botones bancarios
  button: {
    primary: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sky transition-all',
    secondary: 'bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-100 font-semibold px-6 py-3 rounded-xl transition-all',
    ghost: 'text-slate-300 hover:text-slate-100 hover:bg-slate-800 font-semibold px-4 py-2 rounded-lg transition-all'
  },

  // Badges profesionales
  badge: {
    success: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold',
    warning: 'bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold',
    error: 'bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-xs font-semibold',
    info: 'bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3 py-1 rounded-full text-xs font-semibold'
  },

  // Inputs bancarios
  input: {
    base: 'bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/30 outline-none transition-all',
    error: 'bg-slate-900 border-2 border-red-500/50 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500/30 outline-none transition-all'
  },

  // Métricas grandes
  metric: {
    container: 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all',
    label: 'text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2',
    value: 'text-4xl font-bold text-slate-100',
    change: {
      positive: 'text-emerald-400 text-sm font-semibold flex items-center gap-1',
      negative: 'text-red-400 text-sm font-semibold flex items-center gap-1'
    }
  },

  // Status indicators
  status: {
    dot: {
      active: 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse',
      inactive: 'w-2 h-2 rounded-full bg-slate-600',
      warning: 'w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse',
      error: 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
    }
  }
};

/**
 * Utility para combinar class names
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

