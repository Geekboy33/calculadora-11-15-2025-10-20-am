/**
 * Performance Monitoring & Telemetry System
 * Tracks application performance metrics and user interactions
 */

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'api' | 'navigation' | 'bundle' | 'custom';
  metadata?: Record<string, any>;
}

interface NavigationTiming {
  route: string;
  loadTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private navigationTimings: NavigationTiming[] = [];
  private readonly MAX_METRICS = 500;
  private observers: Set<(metrics: PerformanceMetric[]) => void> = new Set();

  constructor() {
    this.setupPerformanceObserver();
    this.setupNavigationTracking();
  }

  /**
   * Setup Performance Observer for web vitals
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Observe Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        this.recordMetric({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          category: 'render',
          metadata: {
            element: lastEntry.element?.tagName,
            url: lastEntry.url,
          },
        });
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            category: 'render',
            metadata: {
              eventType: entry.name,
            },
          });
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            this.recordMetric({
              name: 'CLS',
              value: clsScore,
              category: 'render',
            });
          }
        });
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) {
            this.recordMetric({
              name: 'Long Task',
              value: entry.duration,
              category: 'render',
              metadata: {
                name: entry.name,
              },
            });
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });

    } catch (error) {
      console.warn('[PerformanceMonitor] Observer setup error:', error);
    }
  }

  /**
   * Setup navigation timing tracking
   */
  private setupNavigationTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;

      this.recordMetric({
        name: 'Page Load',
        value: loadTime,
        category: 'navigation',
        metadata: {
          dnsTime: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcpTime: perfData.connectEnd - perfData.connectStart,
          requestTime: perfData.responseEnd - perfData.requestStart,
          renderTime: perfData.domComplete - perfData.domLoading,
        },
      });
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Enforce max metrics limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Notify observers
    this.notifyObservers();

    // Log significant performance issues
    if (metric.category === 'render' && metric.value > 2500) {
      console.warn(`[PerformanceMonitor] Slow ${metric.name}:`, metric.value, 'ms');
    }
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    this.recordMetric({
      name: `Component: ${componentName}`,
      value: renderTime,
      category: 'render',
      metadata: { component: componentName },
    });
  }

  /**
   * Track API call performance
   */
  trackAPICall(
    endpoint: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      name: `API: ${endpoint}`,
      value: duration,
      category: 'api',
      metadata: {
        ...metadata,
        success,
      },
    });
  }

  /**
   * Track navigation timing
   */
  trackNavigation(route: string, loadTime: number): void {
    this.navigationTimings.push({
      route,
      loadTime,
      timestamp: Date.now(),
    });

    this.recordMetric({
      name: `Navigation: ${route}`,
      value: loadTime,
      category: 'navigation',
    });
  }

  /**
   * Track bundle size
   */
  trackBundleSize(chunkName: string, sizeBytes: number): void {
    this.recordMetric({
      name: `Bundle: ${chunkName}`,
      value: sizeBytes,
      category: 'bundle',
      metadata: {
        sizeKB: (sizeBytes / 1024).toFixed(2),
        sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      },
    });
  }

  /**
   * Track custom metric
   */
  trackCustom(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      name,
      value,
      category: 'custom',
      metadata,
    });
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter((m) => m.category === category);
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const filtered = this.metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    avgRenderTime: number;
    avgAPICallTime: number;
    slowestComponents: Array<{ name: string; avgTime: number }>;
    slowestAPIs: Array<{ name: string; avgTime: number }>;
    totalMetrics: number;
  } {
    const renderMetrics = this.getMetricsByCategory('render');
    const apiMetrics = this.getMetricsByCategory('api');

    const avgRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((acc, m) => acc + m.value, 0) / renderMetrics.length
      : 0;

    const avgAPICallTime = apiMetrics.length > 0
      ? apiMetrics.reduce((acc, m) => acc + m.value, 0) / apiMetrics.length
      : 0;

    // Find slowest components
    const componentMetrics = renderMetrics.filter((m) =>
      m.name.startsWith('Component:')
    );
    const componentAvgs = new Map<string, { sum: number; count: number }>();

    componentMetrics.forEach((m) => {
      const existing = componentAvgs.get(m.name) || { sum: 0, count: 0 };
      componentAvgs.set(m.name, {
        sum: existing.sum + m.value,
        count: existing.count + 1,
      });
    });

    const slowestComponents = Array.from(componentAvgs.entries())
      .map(([name, { sum, count }]) => ({
        name: name.replace('Component: ', ''),
        avgTime: sum / count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Find slowest APIs
    const apiAvgs = new Map<string, { sum: number; count: number }>();

    apiMetrics.forEach((m) => {
      const existing = apiAvgs.get(m.name) || { sum: 0, count: 0 };
      apiAvgs.set(m.name, {
        sum: existing.sum + m.value,
        count: existing.count + 1,
      });
    });

    const slowestAPIs = Array.from(apiAvgs.entries())
      .map(([name, { sum, count }]) => ({
        name: name.replace('API: ', ''),
        avgTime: sum / count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    return {
      avgRenderTime,
      avgAPICallTime,
      slowestComponents,
      slowestAPIs,
      totalMetrics: this.metrics.length,
    };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metrics: PerformanceMetric[]) => void): () => void {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify observers
   */
  private notifyObservers(): void {
    this.observers.forEach((callback) => {
      try {
        callback([...this.metrics]);
      } catch (error) {
        console.error('[PerformanceMonitor] Observer error:', error);
      }
    });
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      navigationTimings: this.navigationTimings,
      summary: this.getSummary(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.navigationTimings = [];
    console.log('[PerformanceMonitor] Metrics cleared');
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window !== 'undefined') {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  }

  return () => {};
}
