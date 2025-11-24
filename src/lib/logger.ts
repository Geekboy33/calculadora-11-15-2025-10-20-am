/**
 * Logger Condicional - Solo activo en desarrollo
 * Elimina todos los console.log en producción para mejor performance
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  /**
   * Log normal - solo en desarrollo
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Warning - solo en desarrollo
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Error - siempre se muestra (importante para debugging en producción)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Debug detallado - solo en desarrollo
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Info - solo en desarrollo
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Tabla - solo en desarrollo
   */
  table: (data: any) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * Group - solo en desarrollo
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * Group End - solo en desarrollo
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Time - solo en desarrollo
   */
  time: (label: string) => {
    if (isDev) {
      console.time(label);
    }
  },

  /**
   * Time End - solo en desarrollo
   */
  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(label);
    }
  },

  /**
   * Performance mark - útil para debugging
   */
  performance: {
    mark: (name: string) => {
      if (isDev && 'performance' in window) {
        performance.mark(name);
      }
    },
    measure: (name: string, startMark: string, endMark: string) => {
      if (isDev && 'performance' in window) {
        try {
          performance.measure(name, startMark, endMark);
          const measure = performance.getEntriesByName(name)[0];
          console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
        } catch (e) {
          // Ignore si los marks no existen
        }
      }
    }
  }
};

/**
 * Helper para logs condicionales con prefijo
 */
export const createLogger = (prefix: string) => {
  return {
    log: (...args: any[]) => logger.log(`[${prefix}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${prefix}]`, ...args),
    error: (...args: any[]) => logger.error(`[${prefix}]`, ...args),
    debug: (...args: any[]) => logger.debug(`[${prefix}]`, ...args),
    info: (...args: any[]) => logger.info(`[${prefix}]`, ...args),
  };
};

// Export default para uso simple
export default logger;

