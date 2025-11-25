/**
 * Professional Formatters - Nivel Bancario
 * Formateo correcto para números, monedas y fechas en ES/EN
 */

export class ProfessionalFormatters {
  /**
   * Formatea moneda con localización CORRECTA
   * ES: 1.500.000,50 (punto miles, coma decimales)
   * EN: 1,500,000.50 (coma miles, punto decimales)
   */
  static currency(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string {
    try {
      // Validar que amount sea un número válido
      if (isNaN(amount) || !isFinite(amount)) {
        return locale === 'es-ES' ? `${currency} 0,00` : `${currency} 0.00`;
      }

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback si la moneda no es soportada
      const formatted = locale === 'es-ES'
        ? amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      return `${currency} ${formatted}`;
    }
  }

  /**
   * Formatea número grande con separadores correctos
   * ES: 1.500.000 (punto miles)
   * EN: 1,500,000 (coma miles)
   */
  static number(value: number, locale: string = 'en-US'): string {
    if (isNaN(value) || !isFinite(value)) {
      return '0';
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Formatea número con decimales
   * ES: 1.500,50 (punto miles, coma decimales)
   * EN: 1,500.50 (coma miles, punto decimales)
   */
  static decimal(value: number, decimals: number = 2, locale: string = 'en-US'): string {
    if (isNaN(value) || !isFinite(value)) {
      return locale === 'es-ES' ? '0,00' : '0.00';
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Formatea porcentaje
   * ES: 45,5%
   * EN: 45.5%
   */
  static percentage(value: number, decimals: number = 1, locale: string = 'en-US'): string {
    if (isNaN(value) || !isFinite(value)) {
      return '0%';
    }

    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  /**
   * Formatea fecha con localización CORRECTA
   * ES: 25/11/2025, 14:30:00
   * EN: 11/25/2025, 2:30:00 PM
   */
  static dateTime(date: Date | string | number, locale: string = 'en-US'): string {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      
      if (isNaN(d.getTime())) {
        return '—';
      }

      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: locale === 'en-US'
      }).format(d);
    } catch {
      return '—';
    }
  }

  /**
   * Formatea fecha corta
   * ES: 25/11/2025
   * EN: 11/25/2025
   */
  static date(date: Date | string | number, locale: string = 'en-US'): string {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      
      if (isNaN(d.getTime())) {
        return '—';
      }

      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    } catch {
      return '—';
    }
  }

  /**
   * Formatea números compactos (1K, 1M, 1B)
   * ES: 1,5 M
   * EN: 1.5M
   */
  static compact(value: number, locale: string = 'en-US'): string {
    if (isNaN(value) || !isFinite(value)) {
      return '0';
    }

    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  }

  /**
   * Formatea tiempo relativo (hace 5 minutos)
   * ES: hace 5 minutos
   * EN: 5 minutes ago
   */
  static relativeTime(date: Date | string | number, locale: string = 'en-US'): string {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      
      if (isNaN(d.getTime())) {
        return '—';
      }

      const now = Date.now();
      const diff = now - d.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return locale === 'es-ES' ? `hace ${days} día${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
      }
      if (hours > 0) {
        return locale === 'es-ES' ? `hace ${hours} hora${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
      if (minutes > 0) {
        return locale === 'es-ES' ? `hace ${minutes} minuto${minutes > 1 ? 's' : ''}` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      }
      return locale === 'es-ES' ? 'hace unos segundos' : 'just now';
    } catch {
      return '—';
    }
  }
}

/**
 * Hook para usar formatters con localización automática
 */
export function useFormatters(locale: string = 'en-US') {
  return {
    currency: (amount: number, currency: string = 'USD') => 
      ProfessionalFormatters.currency(amount, currency, locale),
    number: (value: number) => 
      ProfessionalFormatters.number(value, locale),
    decimal: (value: number, decimals: number = 2) => 
      ProfessionalFormatters.decimal(value, decimals, locale),
    percentage: (value: number, decimals: number = 1) => 
      ProfessionalFormatters.percentage(value, decimals, locale),
    dateTime: (date: Date | string | number) => 
      ProfessionalFormatters.dateTime(date, locale),
    date: (date: Date | string | number) => 
      ProfessionalFormatters.date(date, locale),
    compact: (value: number) => 
      ProfessionalFormatters.compact(value, locale),
    relativeTime: (date: Date | string | number) => 
      ProfessionalFormatters.relativeTime(date, locale)
  };
}

