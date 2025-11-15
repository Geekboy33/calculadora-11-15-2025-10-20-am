import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Download } from 'lucide-react';
import { analyticsStore, AnalyticsData, KPIData } from '../lib/analytics-store';
import { getIcon } from '../lib/icon-mapping';

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = analyticsStore.subscribe((data) => {
      if (mounted) {
        setAnalytics(data);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await analyticsStore.refresh();
    setLoading(false);
  };

  const handleExport = () => {
    if (!analytics) return;

    const report = {
      generated: new Date().toISOString(),
      kpis: analytics.kpis,
      comparisons: analytics.comparisons,
      charts: analytics.charts
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderKPI = (kpi: KPIData) => {
    const getTrendIcon = () => {
      if (kpi.trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
      if (kpi.trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
      return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getTrendColor = () => {
      if (kpi.trend === 'up') return 'text-green-400';
      if (kpi.trend === 'down') return 'text-red-400';
      return 'text-gray-400';
    };

    let Icon;
    try {
      Icon = getIcon(kpi.icon);
    } catch (error) {
      console.error('[AnalyticsDashboard] Error getting icon:', kpi.icon, error);
      Icon = getIcon('chart'); // Fallback icon
    }

    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-[#00ff88]/30 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-[#00ff88]/10 rounded-lg">
            <Icon className="w-6 h-6 text-[#00ff88]" />
          </div>
          {getTrendIcon()}
        </div>

        <div className="space-y-1">
          <div className="text-sm text-[#4d7c4d]">{kpi.label}</div>
          <div className="text-3xl font-bold text-[#e0ffe0]">{kpi.formatted}</div>
          <div className={`text-sm font-semibold ${getTrendColor()}`}>
            {kpi.changeFormatted} vs semana anterior
          </div>
        </div>
      </div>
    );
  };

  if (loading && !analytics) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff88] mb-4"></div>
          <p className="text-[#00ff88] text-lg font-semibold">Cargando Analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="h-full overflow-auto bg-black p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#e0ffe0] mb-2">Dashboard Analytics</h1>
            <p className="text-[#80ff80]">
              Última actualización: {new Date(analytics.lastUpdated).toLocaleString('es-ES')}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg text-[#00ff88] hover:border-[#00ff88] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-[#00ff88] text-black rounded-lg hover:bg-[#00cc6a] transition-all font-semibold"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderKPI(analytics.kpis.totalVolume)}
          {renderKPI(analytics.kpis.transactionsToday)}
          {renderKPI(analytics.kpis.averageTransaction)}
          {renderKPI(analytics.kpis.activeCurrencies)}
          {renderKPI(analytics.kpis.custodyAccounts)}
          {renderKPI(analytics.kpis.processingSpeed)}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volume Over Time */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-[#e0ffe0] mb-6">Volumen en el Tiempo (30 días)</h3>
            {analytics.charts.volumeOverTime.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {analytics.charts.volumeOverTime.slice(-15).map((point, index) => {
                const maxValue = Math.max(...analytics.charts.volumeOverTime.map(p => p.value));
                const height = (point.value / maxValue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-[#00ff88] to-[#00cc6a] rounded-t transition-all hover:from-[#00cc6a] hover:to-[#00aa55] cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${point.value.toLocaleString()}`}
                    />
                    <div className="text-xs text-[#4d7c4d] rotate-45 origin-left whitespace-nowrap">
                      {point.label}
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-[#4d7c4d]">No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Currency Distribution */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-[#e0ffe0] mb-6">Distribución por Divisa</h3>
            {analytics.charts.currencyDistribution.length > 0 ? (
            <div className="space-y-4">
              {analytics.charts.currencyDistribution.slice(0, 8).map((dist, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#e0ffe0] font-semibold">{dist.currency}</span>
                    <span className="text-[#80ff80]">{dist.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${dist.percentage}%`,
                        backgroundColor: dist.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-[#4d7c4d]">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Trends */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-[#e0ffe0] mb-6">Tendencia de Transacciones (7 días)</h3>
            <div className="h-48 flex items-end justify-between gap-3">
              {analytics.charts.transactionTrends.map((point, index) => {
                const maxValue = Math.max(...analytics.charts.transactionTrends.map(p => p.value));
                const height = (point.value / maxValue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-sm font-bold text-[#00ff88]">{point.value}</div>
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-400 hover:to-blue-300 cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${point.value} transacciones`}
                    />
                    <div className="text-xs text-[#4d7c4d]">{point.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Currencies */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
            <h3 className="text-xl font-bold text-[#e0ffe0] mb-6">Top 5 Divisas por Volumen</h3>
            <div className="space-y-4">
              {analytics.charts.topCurrencies.map((item, index) => {
                const maxValue = analytics.charts.topCurrencies[0].value;
                const percentage = (item.value / maxValue) * 100;

                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
                      <span className="text-lg font-bold text-[#00ff88]">#{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#e0ffe0] font-bold">{item.currency}</span>
                        <span className="text-[#80ff80]">
                          ${item.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comparisons */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-xl font-bold text-[#e0ffe0] mb-6">Comparaciones de Periodo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-[#0d0d0d] rounded-lg">
              <div className="text-[#4d7c4d] text-sm mb-2">vs Semana Anterior</div>
              <div className={`text-3xl font-bold ${analytics.comparisons.vsLastWeek >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.comparisons.vsLastWeek >= 0 ? '+' : ''}{analytics.comparisons.vsLastWeek.toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-[#0d0d0d] rounded-lg">
              <div className="text-[#4d7c4d] text-sm mb-2">vs Mes Anterior</div>
              <div className={`text-3xl font-bold ${analytics.comparisons.vsLastMonth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.comparisons.vsLastMonth >= 0 ? '+' : ''}{analytics.comparisons.vsLastMonth.toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-[#0d0d0d] rounded-lg">
              <div className="text-[#4d7c4d] text-sm mb-2">vs Año Anterior</div>
              <div className={`text-3xl font-bold ${analytics.comparisons.vsLastYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.comparisons.vsLastYear >= 0 ? '+' : ''}{analytics.comparisons.vsLastYear.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
