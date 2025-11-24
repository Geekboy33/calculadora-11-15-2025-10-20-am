/**
 * Supabase Query Cache System
 * Provides intelligent caching for Supabase queries to improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

class SupabaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Generate a cache key from query parameters
   */
  private generateKey(
    table: string,
    query: string,
    params?: Record<string, any>
  ): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${table}:${query}:${paramStr}`;
  }

  /**
   * Get cached data or execute query
   */
  async get<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const ttl = options.ttl ?? this.DEFAULT_TTL;
    const now = Date.now();

    // Check if we have valid cached data
    const cached = this.cache.get(key);
    if (cached) {
      // Return cached data if not expired
      if (cached.expiresAt > now) {
        console.log(`[SupabaseCache] Cache HIT: ${key}`);
        return cached.data;
      }

      // Stale-while-revalidate: return stale data while fetching fresh
      if (options.staleWhileRevalidate && cached.expiresAt > now - ttl) {
        console.log(`[SupabaseCache] Stale data returned, revalidating: ${key}`);
        this.revalidate(key, queryFn, ttl);
        return cached.data;
      }
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`[SupabaseCache] Request deduplication: ${key}`);
      return pending;
    }

    // Execute the query
    console.log(`[SupabaseCache] Cache MISS: ${key}`);
    const promise = this.executeQuery(key, queryFn, ttl);
    return promise;
  }

  /**
   * Execute query and cache result
   */
  private async executeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const promise = queryFn();
    this.pendingRequests.set(key, promise);

    try {
      const data = await promise;
      const now = Date.now();

      // Store in cache
      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      });

      // Enforce cache size limit (LRU)
      this.enforceCacheLimit();

      return data;
    } catch (error) {
      console.error(`[SupabaseCache] Query error for ${key}:`, error);
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Revalidate stale data in background
   */
  private async revalidate<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      await this.executeQuery(key, queryFn, ttl);
    } catch (error) {
      console.warn(`[SupabaseCache] Revalidation failed for ${key}:`, error);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[SupabaseCache] Invalidated: ${key}`);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`[SupabaseCache] Invalidated ${count} entries matching: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('[SupabaseCache] Cache cleared');
  }

  /**
   * Enforce maximum cache size using LRU strategy
   */
  private enforceCacheLimit(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;

    // Find oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`[SupabaseCache] Removed ${toRemove} oldest entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      expiresIn: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[SupabaseCache] Cleaned up ${removed} expired entries`);
    }
  }
}

// Global cache instance
export const supabaseCache = new SupabaseCache();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    supabaseCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Helper function for common Supabase query patterns
 */
export function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return supabaseCache.get(cacheKey, queryFn, options);
}
