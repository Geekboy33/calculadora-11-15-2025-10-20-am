/**
 * Professional Formatters
 * Sistema de formateo profesional para números, monedas, fechas, etc.
 */

export const formatters = {
  /**
   * Formateo de moneda con símbolo y separadores
   * @example formatters.currency(198000000, 'USD') → "USD 198,000,000.00"
   */
  currency: (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Formateo de número con separadores
   * @example formatters.number(198000000) → "198,000,000.00"
   */
  number: (value: number, locale: string = 'en-US', decimals: number = 2): string => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Formateo compacto (1.5M, 2.3B)
   * @example formatters.compact(198000000) → "198M"
   */
  compact: (value: number, locale: string = 'en-US'): string => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  },

  /**
   * Formateo de porcentaje
   * @example formatters.percentage(28.14432423, 2) → "28.14%"
   */
  percentage: (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Formateo de bytes a unidades legibles
   * @example formatters.bytes(241749196800) → "241.75 GB"
   */
  bytes: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(2)} ${units[i]}`;
  },

  /**
   * Formateo de bytes compacto
   * @example formatters.bytesCompact(241749196800) → "241.7 GB"
   */
  bytesCompact: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
  },

  /**
   * Formateo de fecha relativa
   * @example formatters.relativeTime(date) → "Hace 5 min"
   */
  relativeTime: (date: Date | string, locale: string = 'es-ES'): string => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    const isSpanish = locale.startsWith('es');
    
    if (seconds < 5) return isSpanish ? 'Justo ahora' : 'Just now';
    if (seconds < 60) return isSpanish ? 'Hace un momento' : 'A moment ago';
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      return isSpanish ? `Hace ${mins} min` : `${mins} min ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return isSpanish ? `Hace ${hours} h` : `${hours} h ago`;
    }
    if (seconds < 604800) {
      const days = Math.floor(seconds / 86400);
      return isSpanish ? `Hace ${days} día${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    return then.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Formateo de fecha completa
   * @example formatters.dateTime(date) → "24 Nov 2025, 14:30"
   */
  dateTime: (date: Date | string, locale: string = 'es-ES'): string => {
    const d = new Date(date);
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Formateo de duración
   * @example formatters.duration(3665) → "1h 1m 5s"
   */
  duration: (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    
    return parts.join(' ');
  },

  /**
   * Formateo de número de teléfono
   * @example formatters.phone('+1234567890') → "+1 (234) 567-890"
   */
  phone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{0,4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  },

  /**
   * Abreviar texto largo
   * @example formatters.truncate('Long text...', 10) → "Long te..."
   */
  truncate: (text: string, length: number): string => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },

  /**
   * Formateo de hash/address blockchain
   * @example formatters.address('0x742d...') → "0x742d...4b2a"
   */
  address: (address: string, start: number = 6, end: number = 4): string => {
    if (address.length <= start + end) return address;
    return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
  },
};

/**
 * Helper para formatear moneda según idioma
 */
export function formatCurrencyByLocale(amount: number, currency: string, isSpanish: boolean): string {
  return formatters.currency(amount, currency, isSpanish ? 'es-ES' : 'en-US');
}

/**
 * Helper para formatear bytes con color
 */
export function formatBytesWithColor(bytes: number): { text: string; color: string } {
  const formatted = formatters.bytes(bytes);
  const gb = bytes / (1024 * 1024 * 1024);
  
  let color = 'text-white';
  if (gb > 500) color = 'text-red-400';
  else if (gb > 100) color = 'text-amber-400';
  else if (gb > 10) color = 'text-[#00ff88]';
  
  return { text: formatted, color };
}

export default formatters;

