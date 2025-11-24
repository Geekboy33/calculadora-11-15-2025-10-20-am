/**
 * Design Tokens - Sistema de diseño profesional
 * Valores consistentes para toda la plataforma
 */

export const designTokens = {
  // Espaciado consistente (sistema 8px)
  spacing: {
    '0': '0',
    '1': '0.25rem',   // 4px
    '2': '0.5rem',    // 8px
    '3': '0.75rem',   // 12px
    '4': '1rem',      // 16px
    '5': '1.25rem',   // 20px
    '6': '1.5rem',    // 24px
    '8': '2rem',      // 32px
    '10': '2.5rem',   // 40px
    '12': '3rem',     // 48px
    '16': '4rem',     // 64px
    '20': '5rem',     // 80px
    '24': '6rem',     // 96px
  },

  // Border radius consistente
  radius: {
    none: '0',
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '3rem',    // 48px
    full: '9999px',
  },

  // Tipografía profesional
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Paleta de colores profesional
  colors: {
    // Primary (verde neón)
    primary: {
      50: '#e6fff5',
      100: '#ccffeb',
      200: '#99ffd6',
      300: '#66ffc2',
      400: '#33ffad',
      500: '#00ff88',    // Principal
      600: '#00cc6a',
      700: '#00994d',
      800: '#006633',
      900: '#00331a',
    },
    
    // Neutral (grises/negros)
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    
    // Estados
    success: '#00ff88',
    warning: '#ffa500',
    error: '#ff6b6b',
    info: '#00b3ff',
    
    // Superficies
    surface: {
      base: '#000000',
      elevated: '#0a0a0a',
      card: '#0d0d0d',
      hover: '#141414',
      border: '#1a1a1a',
    },
    
    // Texto
    text: {
      primary: '#ffffff',
      secondary: '#e0ffe0',
      tertiary: '#80ff80',
      muted: '#4d7c4d',
      inverse: '#000000',
    },
    
    // Divisas (para Account Ledger)
    currency: {
      USD: '#00ff88',
      EUR: '#00b3ff',
      GBP: '#ff8c00',
      CHF: '#39ff14',
      JPY: '#ff6b6b',
      CAD: '#00ffff',
      AUD: '#ffa500',
      CNY: '#ff4444',
      INR: '#ff88ff',
      MXN: '#88ff88',
      BRL: '#ffff00',
      RUB: '#ff8888',
      KRW: '#ff88ff',
      SGD: '#88ffff',
      HKD: '#ffaa88',
    },
  },

  // Sombras profesionales
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    // Sombras con color de marca
    glow: '0 0 20px rgba(0, 255, 136, 0.5)',
    'glow-sm': '0 0 10px rgba(0, 255, 136, 0.3)',
    'glow-md': '0 0 20px rgba(0, 255, 136, 0.5)',
    'glow-lg': '0 0 30px rgba(0, 255, 136, 0.6)',
    'glow-xl': '0 0 40px rgba(0, 255, 136, 0.7)',
  },

  // Transiciones
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Z-index
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
  },
};

/**
 * Helper para obtener color de divisa
 */
export function getCurrencyColor(currency: string): string {
  return designTokens.colors.currency[currency as keyof typeof designTokens.colors.currency] || designTokens.colors.primary[500];
}

/**
 * Helper para obtener gradiente de divisa
 */
export function getCurrencyGradient(currency: string): string {
  const color = getCurrencyColor(currency);
  return `from-[${color}]/20 to-[${color}]/5`;
}

export default designTokens;

