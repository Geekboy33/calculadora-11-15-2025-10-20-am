/**
 * Performance Optimization Usage Examples
 * Demonstrates how to use the new caching and monitoring systems
 */

import { supabaseCache, cachedQuery } from '../src/lib/supabase-cache';
import { performanceMonitor, usePerformanceTracking } from '../src/lib/performance-monitor';
import { supabase } from '../src/lib/supabase-client';

// ============================================
// Example 1: Using Supabase Cache
// ============================================

async function getCurrencyBalances(userId: string) {
  // Without cache (old way) - every call hits database
  // const { data } = await supabase
  //   .from('currency_balances')
  //   .select('*')
  //   .eq('user_id', userId);

  // With cache (new way) - cached for 5 minutes
  const data = await cachedQuery(
    `balances:user:${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: true, // Return stale data while fetching fresh
    }
  );

  return data;
}

// ============================================
// Example 2: Invalidating Cache on Updates
// ============================================

async function updateBalance(userId: string, currency: string, amount: number) {
  // Update database
  const { error } = await supabase
    .from('currency_balances')
    .update({ total_amount: amount })
    .eq('user_id', userId)
    .eq('currency', currency);

  if (error) throw error;

  // Invalidate relevant cache entries
  supabaseCache.invalidatePattern(`balances:user:${userId}`);
  supabaseCache.invalidatePattern(`ledger:${currency}`);

  console.log('✓ Balance updated and cache invalidated');
}

// ============================================
// Example 3: Using Performance Monitor in API Calls
// ============================================

async function fetchDataWithTracking(endpoint: string) {
  const startTime = performance.now();
  let success = false;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    success = true;

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  } finally {
    const duration = performance.now() - startTime;

    // Track API performance
    performanceMonitor.trackAPICall(
      endpoint,
      duration,
      success,
      {
        method: 'GET',
        timestamp: new Date().toISOString(),
      }
    );
  }
}

// ============================================
// Example 4: React Component Performance Tracking
// ============================================

import { useEffect } from 'react';

function OptimizedComponent() {
  // Track component render time
  const trackRender = usePerformanceTracking('OptimizedComponent');

  useEffect(() => {
    // Component mounted - cleanup tracking
    return trackRender;
  }, []);

  // Heavy computation
  const processData = (data: any[]) => {
    const start = performance.now();

    // Process data
    const result = data.map(item => ({
      ...item,
      processed: true,
    }));

    // Track custom metric
    performanceMonitor.trackCustom(
      'Data Processing Time',
      performance.now() - start,
      { itemCount: data.length }
    );

    return result;
  };

  return <div>Optimized Component</div>;
}

// ============================================
// Example 5: Getting Performance Insights
// ============================================

function analyzePerformance() {
  // Get comprehensive summary
  const summary = performanceMonitor.getSummary();

  console.log('=== Performance Summary ===');
  console.log(`Average Render Time: ${summary.avgRenderTime.toFixed(2)}ms`);
  console.log(`Average API Call Time: ${summary.avgAPICallTime.toFixed(2)}ms`);

  console.log('\nSlowest Components:');
  summary.slowestComponents.forEach((comp, i) => {
    console.log(`${i + 1}. ${comp.name}: ${comp.avgTime.toFixed(2)}ms`);
  });

  console.log('\nSlowest APIs:');
  summary.slowestAPIs.forEach((api, i) => {
    console.log(`${i + 1}. ${api.name}: ${api.avgTime.toFixed(2)}ms`);
  });

  // Get cache statistics
  const cacheStats = supabaseCache.getStats();
  console.log('\n=== Cache Statistics ===');
  console.log(`Cache Size: ${cacheStats.size}/${cacheStats.maxSize}`);
  console.log(`Entries: ${cacheStats.entries.length}`);

  // Export full metrics to file
  const metricsJSON = performanceMonitor.exportMetrics();
  console.log('\nFull metrics exported to JSON');

  return {
    summary,
    cacheStats,
    metricsJSON,
  };
}

// ============================================
// Example 6: Advanced Caching Patterns
// ============================================

// Pattern 1: Cache with dependencies
async function getCachedUserData(userId: string) {
  const [balances, accounts, transactions] = await Promise.all([
    cachedQuery(
      `balances:${userId}`,
      () => fetchBalances(userId),
      { ttl: 5 * 60 * 1000 }
    ),
    cachedQuery(
      `accounts:${userId}`,
      () => fetchAccounts(userId),
      { ttl: 10 * 60 * 1000 }
    ),
    cachedQuery(
      `transactions:${userId}`,
      () => fetchTransactions(userId),
      { ttl: 2 * 60 * 1000 }
    ),
  ]);

  return { balances, accounts, transactions };
}

// Pattern 2: Conditional caching
async function getDataWithSmartCaching(
  key: string,
  fetchFn: () => Promise<any>,
  options: { forceRefresh?: boolean; ttl?: number }
) {
  if (options.forceRefresh) {
    supabaseCache.invalidate(key);
  }

  return cachedQuery(key, fetchFn, {
    ttl: options.ttl || 5 * 60 * 1000,
    staleWhileRevalidate: true,
  });
}

// Pattern 3: Paginated data caching
async function getCachedPaginatedData(
  page: number,
  pageSize: number,
  userId: string
) {
  return cachedQuery(
    `paginated:${userId}:page:${page}:size:${pageSize}`,
    async () => {
      const { data, error } = await supabase
        .from('transactions_history')
        .select('*')
        .eq('user_id', userId)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    { ttl: 3 * 60 * 1000 }
  );
}

// ============================================
// Example 7: Real-time Performance Monitoring
// ============================================

// Setup real-time monitoring
function setupRealtimeMonitoring() {
  // Subscribe to performance updates
  const unsubscribe = performanceMonitor.subscribe((metrics) => {
    const recentMetrics = metrics.slice(-10);

    // Check for performance issues
    recentMetrics.forEach((metric) => {
      if (metric.category === 'render' && metric.value > 2000) {
        console.warn(`⚠️  Slow render detected: ${metric.name} took ${metric.value}ms`);
      }

      if (metric.category === 'api' && metric.value > 5000) {
        console.warn(`⚠️  Slow API call: ${metric.name} took ${metric.value}ms`);
      }
    });
  });

  // Cleanup
  return unsubscribe;
}

// ============================================
// Example 8: Cache Warming
// ============================================

async function warmCache(userId: string) {
  console.log('🔥 Warming cache for user:', userId);

  // Preload frequently accessed data
  await Promise.all([
    getCurrencyBalances(userId),
    getCachedUserData(userId),
    cachedQuery(
      `ledger:accounts:${userId}`,
      () => supabase.from('ledger_accounts').select('*').eq('user_id', userId),
      { ttl: 10 * 60 * 1000 }
    ),
  ]);

  console.log('✓ Cache warmed successfully');
}

// ============================================
// Helper Functions (examples)
// ============================================

async function fetchBalances(userId: string) {
  const { data, error } = await supabase
    .from('currency_balances')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

async function fetchAccounts(userId: string) {
  const { data, error } = await supabase
    .from('ledger_accounts')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions_history')
    .select('*')
    .eq('user_id', userId)
    .limit(100);

  if (error) throw error;
  return data;
}

// ============================================
// Export Examples
// ============================================

export {
  getCurrencyBalances,
  updateBalance,
  fetchDataWithTracking,
  analyzePerformance,
  getCachedUserData,
  getDataWithSmartCaching,
  getCachedPaginatedData,
  setupRealtimeMonitoring,
  warmCache,
};
