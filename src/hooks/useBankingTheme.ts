/**
 * Banking Theme Hook
 * Hook para aplicar tema bancario uniforme en toda la plataforma
 */

import { useLanguage } from '../lib/i18n';
import { useFormatters } from '../lib/professional-formatters';

export function useBankingTheme() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const locale = isSpanish ? 'es-ES' : 'en-US';
  const fmt = useFormatters(locale);

  // Colores del tema bancario
  const colors = {
    primary: {
      bg: 'bg-slate-950',
      card: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
      border: 'border-slate-700',
      text: 'text-slate-100'
    },
    accent: {
      sky: 'text-sky-400',
      emerald: 'text-emerald-400',
      amber: 'text-amber-400',
      purple: 'text-purple-400'
    },
    status: {
      success: 'text-emerald-400',
      warning: 'text-amber-400',
      error: 'text-red-400',
      info: 'text-sky-400'
    }
  };

  // Estilos de componentes
  const styles = {
    card: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-xl',
    cardElevated: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-600 rounded-2xl shadow-2xl',
    button: {
      primary: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-sky transition-all',
      secondary: 'bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-100 font-semibold px-6 py-3 rounded-xl transition-all'
    },
    input: 'bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/30 outline-none transition-all',
    badge: {
      success: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold',
      warning: 'bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold',
      error: 'bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-xs font-semibold',
      info: 'bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3 py-1 rounded-full text-xs font-semibold'
    }
  };

  return {
    colors,
    styles,
    isSpanish,
    locale,
    fmt
  };
}

