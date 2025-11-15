/**
 * Rate Limiter - Control de Límites de Tasa Global
 * Protección contra abuso y gestión de cuotas
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  isBlocked: boolean;
  blockedUntil?: Date;
}

interface RequestRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const DEFAULT_LIMITS: { [key: string]: RateLimitConfig } = {
  'api:general': { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  'api:upload': { maxRequests: 10, windowMs: 60000 }, // 10 uploads/min
  'api:export': { maxRequests: 20, windowMs: 60000 }, // 20 exports/min
  'api:search': { maxRequests: 50, windowMs: 60000 }, // 50 searches/min
  'auth:login': { maxRequests: 5, windowMs: 300000, blockDurationMs: 900000 }, // 5 attempts/5min, block 15min
  'auth:password-reset': { maxRequests: 3, windowMs: 3600000 }, // 3 resets/hour
};

class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.loadFromStorage();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Check if request is allowed
   */
  checkLimit(endpoint: string, identifier: string = 'default'): boolean {
    const key = this.getKey(endpoint, identifier);
    const config = this.getConfig(endpoint);
    const now = Date.now();

    // Get or create record
    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return false;
    }

    // Remove blocked status if expired
    if (record.blockedUntil && record.blockedUntil <= now) {
      delete record.blockedUntil;
    }

    // Remove old timestamps outside the window
    record.timestamps = record.timestamps.filter(
      ts => ts > now - config.windowMs
    );

    // Check if limit exceeded
    if (record.timestamps.length >= config.maxRequests) {
      // Block if configured
      if (config.blockDurationMs) {
        record.blockedUntil = now + config.blockDurationMs;
        console.warn(`[RateLimiter] ${key} blocked until ${new Date(record.blockedUntil)}`);
      }

      this.saveToStorage();
      return false;
    }

    // Add current timestamp
    record.timestamps.push(now);
    this.saveToStorage();

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(endpoint: string, identifier: string = 'default'): void {
    this.checkLimit(endpoint, identifier);
  }

  /**
   * Get rate limit status
   */
  getStatus(endpoint: string, identifier: string = 'default'): RateLimitStatus {
    const key = this.getKey(endpoint, identifier);
    const config = this.getConfig(endpoint);
    const now = Date.now();

    const record = this.records.get(key);

    if (!record) {
      return {
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
        isBlocked: false
      };
    }

    // Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        remaining: 0,
        resetTime: new Date(record.blockedUntil),
        isBlocked: true,
        blockedUntil: new Date(record.blockedUntil)
      };
    }

    // Count requests in current window
    const recentRequests = record.timestamps.filter(
      ts => ts > now - config.windowMs
    );

    const remaining = Math.max(0, config.maxRequests - recentRequests.length);

    // Calculate reset time (oldest timestamp + window)
    const oldestTimestamp = recentRequests[0] || now;
    const resetTime = new Date(oldestTimestamp + config.windowMs);

    return {
      remaining,
      resetTime,
      isBlocked: false
    };
  }

  /**
   * Reset limits for endpoint
   */
  resetLimit(endpoint: string, identifier: string = 'default'): void {
    const key = this.getKey(endpoint, identifier);
    this.records.delete(key);
    this.saveToStorage();
    console.log(`[RateLimiter] Limits reset for ${key}`);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.records.clear();
    this.saveToStorage();
    console.log('[RateLimiter] All limits reset');
  }

  /**
   * Get configuration for endpoint
   */
  private getConfig(endpoint: string): RateLimitConfig {
    return DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['api:general'];
  }

  /**
   * Generate key for endpoint and identifier
   */
  private getKey(endpoint: string, identifier: string): string {
    return `${endpoint}:${identifier}`;
  }

  /**
   * Cleanup old records
   */
  private cleanup(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(...Object.values(DEFAULT_LIMITS).map(c => c.windowMs));

    for (const [key, record] of this.records.entries()) {
      // Remove expired blocks
      if (record.blockedUntil && record.blockedUntil < now) {
        delete record.blockedUntil;
      }

      // Remove old timestamps
      record.timestamps = record.timestamps.filter(
        ts => ts > now - maxWindowMs
      );

      // Remove empty records
      if (record.timestamps.length === 0 && !record.blockedUntil) {
        this.records.delete(key);
      }
    }

    this.saveToStorage();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: any = {};
      this.records.forEach((record, key) => {
        data[key] = record;
      });
      localStorage.setItem('rate_limiter', JSON.stringify(data));
    } catch (error) {
      console.error('[RateLimiter] Error saving to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('rate_limiter');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, record]: [string, any]) => {
          this.records.set(key, record);
        });
      }
    } catch (error) {
      console.error('[RateLimiter] Error loading from storage:', error);
    }
  }

  /**
   * Get all limits status
   */
  getAllStatus(): { [key: string]: RateLimitStatus } {
    const status: { [key: string]: RateLimitStatus } = {};

    Object.keys(DEFAULT_LIMITS).forEach(endpoint => {
      status[endpoint] = this.getStatus(endpoint);
    });

    return status;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to check and record
export function checkAndRecord(endpoint: string, identifier?: string): boolean {
  return rateLimiter.checkLimit(endpoint, identifier);
}

// Decorator for rate-limited functions
export function rateLimit(endpoint: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!rateLimiter.checkLimit(endpoint)) {
        throw new Error(`Rate limit exceeded for ${endpoint}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
