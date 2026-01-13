// src/components/DeFiProtocolsModule.tsx
// DeFi Protocols Module - Advanced Multi-Strategy Bot Dashboard

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BotConfig, BotType, NetworkType, BotStatus } from '../modules/DeFiProtocols/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChainStatus {
  chain: string;
  name: string;
  chainId: number;
  balance: string;
  balanceUsd: number;
  routes?: number;
  isActive: boolean;
  lastScan?: number;
  explorer: string;
  ethPrice?: number;
  connected: boolean;
  hasAave?: boolean;
  hasSushi?: boolean;
  protocols?: string[];
}

interface Strategy {
  enabled: boolean;
  scans: number;
  opportunities: number;
  executions: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  winRate: number;
  selected: boolean;
  attempts?: number;
  wins?: number;
}

interface TradeLog {
  id: string;
  timestamp: number;
  chain: string;
  chainName?: string;
  strategy: string;
  route: string;
  amountIn: number | string;
  expectedProfit?: string;
  actualProfit?: string;
  gasCost?: string;
  netProfit: string;
  txHash?: string;
  status: 'success' | 'failed' | 'pending';
  simulated?: boolean;
  error?: string;
  executionTimeMs?: number;
}

interface Opportunity {
  chain: string;
  chainName?: string;
  strategy: string;
  type?: string;
  route: string;
  amountInEth?: number;
  flashAmount?: number;
  spreadBps?: number;
  netProfitUsd: number;
  gasCostUsd: number;
  ethPrice?: number;
  profitable: boolean;
  timestamp: number;
}

interface BotStats {
  totalScans: number;
  opportunitiesFound: number;
  flashLoanOpps: number;
  mevOpps: number;
  triangularOpps: number;
  simpleArbOpps: number;
  tradesAttempted: number;
  tradesExecuted: number;
  tradesSuccessful: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgScanTimeMs: number;
  scansPerSecond: number;
  uptime: number;
  currentChain: string;
  currentStrategy: string;
  lastOpportunity?: Opportunity;
  lastTrade?: TradeLog;
}

interface BotState {
  isRunning: boolean;
  isDryRun: boolean;
  startTime: number | null;
  mode: string;
  stats: BotStats;
  chains: ChainStatus[];
  tradeLogs: TradeLog[];
  opportunities: Opportunity[];
  banditStates: BanditState[];
  strategies: {
    flashLoan: Strategy;
    mev: Strategy;
    triangular: Strategy;
    simpleArb: Strategy;
    crossDex: Strategy;
    liquidation: Strategy;
  };
  mempool?: {
    pendingTxs: number;
    largeTxs: any[];
    sandwichTargets: any[];
  };
}

const CHAINS_CONFIG = {
  base: { name: 'Base', chainId: 8453, color: '#0052FF', icon: '🔵', explorer: 'https://basescan.org' },
  arbitrum: { name: 'Arbitrum', chainId: 42161, color: '#28A0F0', icon: '🔷', explorer: 'https://arbiscan.io' },
  optimism: { name: 'Optimism', chainId: 10, color: '#FF0420', icon: '🔴', explorer: 'https://optimistic.etherscan.io' },
  polygon: { name: 'Polygon', chainId: 137, color: '#8247E5', icon: '🟣', explorer: 'https://polygonscan.com' }
};

const STRATEGY_CONFIG = {
  flashLoan: { name: 'Flash Loans', icon: '⚡', color: '#FFD700', description: 'Aave V3 - Préstamos sin colateral' },
  mev: { name: 'MEV Bot', icon: '🥪', color: '#FF6B6B', description: 'Sandwich & Front-running detection' },
  triangular: { name: 'Triangular', icon: '🔺', color: '#4ECDC4', description: '3-token cycle arbitrage' },
  simpleArb: { name: 'Fee Tier Arb', icon: '📈', color: '#45B7D1', description: 'Uniswap V3 fee tier arbitrage' },
  crossDex: { name: 'Cross-DEX', icon: '🔄', color: '#96CEB4', description: 'Uniswap vs SushiSwap' },
  liquidation: { name: 'Liquidation', icon: '💀', color: '#DDA0DD', description: 'Unhealthy positions hunting' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const DeFiProtocolsModule: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'strategies' | 'chains' | 'contracts' | 'trades' | 'settings'>('dashboard');
  const [botState, setBotState] = useState<BotState | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // API FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchBotStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/defi/multichain-arb/status');
      if (response.ok) {
        const data = await response.json();
        // Map server response to expected format
        const mappedState: BotState = {
          ...data,
          isRunning: data.status === 'running',
          startTime: data.uptimeSeconds ? Date.now() - (data.uptimeSeconds * 1000) : null,
          mode: data.isDryRun ? 'dry' : 'live'
        };
        setBotState(mappedState);
        setLastUpdate(new Date());
        setIsConnected(true);
      }
    } catch (error) {
      setIsConnected(false);
    }
  }, []);

  const startBot = async (dryRun: boolean = false) => {
    try {
      // Immediately update UI to show starting
      setBotState(prev => prev ? { ...prev, isRunning: true, isDryRun: dryRun, mode: dryRun ? 'dry' : 'live' } : null);
      
      const response = await fetch('/api/defi/multichain-arb/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });
      
      if (response.ok) {
        // Refresh status to get accurate data
        setTimeout(fetchBotStatus, 500);
      } else {
        // Revert on failure
        fetchBotStatus();
      }
    } catch (error) {
      console.error('Error starting bot:', error);
      fetchBotStatus();
    }
  };

  const stopBot = async () => {
    try {
      await fetch('/api/defi/multichain-arb/stop', { method: 'POST' });
      fetchBotStatus();
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  };

  const toggleStrategy = async (strategyName: string) => {
    try {
      await fetch(`/api/defi/multichain-arb/strategy/${strategyName}/toggle`, { method: 'POST' });
      fetchBotStatus();
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    intervalRef.current = setInterval(fetchBotStatus, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBotStatus]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number | undefined, decimals: number = 2): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const getStrategyOpportunities = (strategyKey: string): Opportunity[] => {
    if (!botState?.opportunities) return [];
    return botState.opportunities.filter(o => 
      o.strategy?.toLowerCase().replace('_', '') === strategyKey.toLowerCase() ||
      o.strategy?.toLowerCase() === strategyKey.toLowerCase()
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🔥 Advanced Multi-Strategy Bot</h1>
          <p style={styles.subtitle}>Flash Loans • MEV • Triangular • Cross-DEX • Liquidation</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.connectionStatus}>
            <span style={{ ...styles.connectionDot, backgroundColor: isConnected ? '#00ff88' : '#ff4444' }} />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </div>
          <div style={styles.statusBadge}>
            <span style={{ ...styles.statusDot, backgroundColor: botState?.isRunning ? '#00ff88' : '#ff4444' }} />
            {botState?.isRunning ? 'RUNNING' : 'STOPPED'}
          </div>
          <div style={{ ...styles.modeBadge, backgroundColor: botState?.isDryRun ? '#ffaa00' : '#ff4444' }}>
            {botState?.isDryRun ? '🔒 DRY RUN' : '🔴 LIVE MODE'}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.controlButtons}>
          {!botState?.isRunning ? (
            <>
              <button style={styles.startButtonLive} onClick={() => startBot(false)}>
                🔴 Iniciar LIVE
              </button>
              <button style={styles.startButtonDry} onClick={() => startBot(true)}>
                🔒 Iniciar DRY RUN
              </button>
            </>
          ) : (
            <button style={styles.stopButton} onClick={stopBot}>
              ⏹️ Detener Bot
            </button>
          )}
        </div>
        <div style={styles.statsQuick}>
          <div style={styles.quickStat}>
            <span style={styles.quickLabel}>Uptime</span>
            <span style={styles.quickValue}>{formatUptime(botState?.stats?.uptime || 0)}</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickLabel}>Scans/s</span>
            <span style={styles.quickValue}>{formatNumber(botState?.stats?.scansPerSecond || 0, 1)}</span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickLabel}>Profit Neto</span>
            <span style={{ ...styles.quickValue, color: (botState?.stats?.netProfitUsd || 0) >= 0 ? '#00ff88' : '#ff4444' }}>
              ${formatNumber(botState?.stats?.netProfitUsd || 0)}
            </span>
          </div>
          <div style={styles.quickStat}>
            <span style={styles.quickLabel}>Win Rate</span>
            <span style={styles.quickValue}>{formatNumber(botState?.stats?.winRate || 0)}%</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        {(['dashboard', 'strategies', 'chains', 'contracts', 'trades', 'settings'] as const).map(view => (
          <button
            key={view}
            style={{ ...styles.navButton, ...(activeView === view ? styles.navButtonActive : {}) }}
            onClick={() => setActiveView(view)}
          >
            {view === 'dashboard' && '📊 Dashboard'}
            {view === 'strategies' && '⚡ Estrategias'}
            {view === 'chains' && '⛓️ Chains'}
            {view === 'contracts' && '📜 Contratos'}
            {view === 'trades' && '💰 Trades'}
            {view === 'settings' && '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'dashboard' && (
          <div style={styles.dashboardGrid}>
            {/* Stats Row */}
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📊</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Total Scans</span>
                  <span style={styles.statValue}>{(botState?.stats?.totalScans || 0).toLocaleString()}</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🎯</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Oportunidades</span>
                  <span style={styles.statValue}>{botState?.stats?.opportunitiesFound || 0}</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>✅</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Trades Exitosos</span>
                  <span style={styles.statValue}>{botState?.stats?.tradesSuccessful || 0}/{botState?.stats?.tradesExecuted || 0}</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Profit Total</span>
                  <span style={{ ...styles.statValue, color: '#00ff88' }}>${formatNumber(botState?.stats?.totalProfitUsd || 0)}</span>
                </div>
              </div>
            </div>

            {/* Strategy Overview Cards */}
            <div style={styles.strategyOverview}>
              <h3 style={styles.sectionTitle}>⚡ Estrategias Activas</h3>
              <div style={styles.strategyCards}>
                {Object.entries(STRATEGY_CONFIG).map(([key, config]) => {
                  const strategy = botState?.strategies?.[key as keyof typeof botState.strategies];
                  const opps = getStrategyOpportunities(key);
                  return (
                    <div 
                      key={key} 
                      style={{ 
                        ...styles.strategyMiniCard, 
                        borderColor: config.color,
                        opacity: strategy?.enabled ? 1 : 0.5 
                      }}
                      onClick={() => { setSelectedStrategy(key); setActiveView('strategies'); }}
                    >
                      <div style={styles.strategyMiniHeader}>
                        <span style={styles.strategyMiniIcon}>{config.icon}</span>
                        <span style={styles.strategyMiniName}>{config.name}</span>
                        <span style={{ 
                          ...styles.strategyMiniStatus, 
                          backgroundColor: strategy?.enabled ? '#00ff8820' : '#ff444420',
                          color: strategy?.enabled ? '#00ff88' : '#ff4444'
                        }}>
                          {strategy?.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div style={styles.strategyMiniStats}>
                        <div><span style={styles.miniStatLabel}>Scans</span><span style={styles.miniStatValue}>{strategy?.scans || 0}</span></div>
                        <div><span style={styles.miniStatLabel}>Opps</span><span style={styles.miniStatValue}>{strategy?.opportunities || 0}</span></div>
                        <div><span style={styles.miniStatLabel}>Exec</span><span style={styles.miniStatValue}>{strategy?.executions || 0}</span></div>
                      </div>
                      {opps.length > 0 && (
                        <div style={styles.strategyMiniOpp}>
                          <span style={{ color: opps[0].profitable ? '#00ff88' : '#ff4444' }}>
                            ${formatNumber(opps[0].netProfitUsd)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chains Status */}
            <div style={styles.chainsOverview}>
              <h3 style={styles.sectionTitle}>⛓️ Chains Conectadas</h3>
              <div style={styles.chainsList}>
                {botState?.chains?.map(chain => {
                  const config = CHAINS_CONFIG[chain.chain as keyof typeof CHAINS_CONFIG];
                  return (
                    <div key={chain.chain} style={styles.chainMiniCard}>
                      <div style={styles.chainMiniLeft}>
                        <span style={styles.chainMiniIcon}>{config?.icon || '🔗'}</span>
                        <div>
                          <span style={styles.chainMiniName}>{chain.name}</span>
                          <span style={{ ...styles.chainMiniStatus, color: chain.connected ? '#00ff88' : '#ff4444' }}>
                            {chain.connected ? '● Conectado' : '○ Desconectado'}
                          </span>
                        </div>
                      </div>
                      <div style={styles.chainMiniRight}>
                        <span style={styles.chainMiniBalance}>{chain.balance || '0'} ETH</span>
                        <span style={styles.chainMiniUsd}>${formatNumber(chain.balanceUsd || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.totalBalance}>
                <span>Balance Total:</span>
                <span style={styles.totalValue}>
                  ${formatNumber(botState?.chains?.reduce((sum, c) => sum + (c.balanceUsd || 0), 0) || 0)}
                </span>
              </div>
            </div>

            {/* Live Opportunities */}
            <div style={styles.liveOpportunities}>
              <h3 style={styles.sectionTitle}>🔍 Oportunidades en Vivo</h3>
              <div style={styles.opportunitiesList}>
                {(!botState?.opportunities || botState.opportunities.length === 0) ? (
                  <div style={styles.noData}>Escaneando oportunidades...</div>
                ) : (
                  botState.opportunities.slice(0, 8).map((opp, i) => (
                    <div key={i} style={styles.opportunityRow}>
                      <div style={styles.oppStrategy}>
                        <span>{STRATEGY_CONFIG[opp.strategy?.toLowerCase().replace('_', '') as keyof typeof STRATEGY_CONFIG]?.icon || '📊'}</span>
                        <span>{opp.strategy}</span>
                      </div>
                      <div style={styles.oppChain}>
                        {CHAINS_CONFIG[opp.chain as keyof typeof CHAINS_CONFIG]?.icon || '🔗'} {opp.chain}
                      </div>
                      <div style={styles.oppRoute}>{opp.route}</div>
                      <div style={{ ...styles.oppProfit, color: opp.profitable ? '#00ff88' : '#ff4444' }}>
                        ${formatNumber(opp.netProfitUsd)}
                      </div>
                      <div style={{ ...styles.oppProfitable, backgroundColor: opp.profitable ? '#00ff8820' : '#ff444420', color: opp.profitable ? '#00ff88' : '#ff4444' }}>
                        {opp.profitable ? '✓' : '✗'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.recentActivity}>
              <h3 style={styles.sectionTitle}>📡 Actividad Reciente</h3>
              <div style={styles.activityFeed}>
                <div style={styles.activityItem}>
                  <span style={styles.activityTime}>{lastUpdate.toLocaleTimeString()}</span>
                  <span>🔄 Escaneando {botState?.stats?.currentChain || 'base'} - {botState?.stats?.currentStrategy || 'SCANNING'}</span>
                </div>
                {botState?.stats?.lastOpportunity && (
                  <div style={styles.activityItem}>
                    <span style={styles.activityTime}>{new Date(botState.stats.lastOpportunity.timestamp).toLocaleTimeString()}</span>
                    <span>🎯 Oportunidad: {botState.stats.lastOpportunity.strategy} ${formatNumber(botState.stats.lastOpportunity.netProfitUsd)}</span>
                  </div>
                )}
                {botState?.stats?.lastTrade && (
                  <div style={styles.activityItem}>
                    <span style={styles.activityTime}>{new Date(botState.stats.lastTrade.timestamp).toLocaleTimeString()}</span>
                    <span>💰 Trade: {botState.stats.lastTrade.strategy} ${botState.stats.lastTrade.netProfit}</span>
                  </div>
                )}
                <div style={styles.activityItem}>
                  <span style={styles.activityTime}>{new Date(Date.now() - 5000).toLocaleTimeString()}</span>
                  <span>📊 Scan #{botState?.stats?.totalScans || 0} | {botState?.stats?.avgScanTimeMs || 0}ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* STRATEGIES VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'strategies' && (
          <div style={styles.strategiesContainer}>
            <h2 style={styles.pageTitle}>⚡ Visores de Estrategias</h2>
            <p style={styles.pageSubtitle}>Cada estrategia tiene su propio escáner y ejecutor independiente</p>
            
            <div style={styles.strategiesGrid}>
              {Object.entries(STRATEGY_CONFIG).map(([key, config]) => {
                const strategy = botState?.strategies?.[key as keyof typeof botState.strategies];
                const opps = getStrategyOpportunities(key);
                const isSelected = selectedStrategy === key;
                
                return (
                  <div 
                    key={key} 
                    style={{ 
                      ...styles.strategyCard, 
                      borderColor: config.color,
                      ...(isSelected ? { boxShadow: `0 0 30px ${config.color}40` } : {})
                    }}
                  >
                    <div style={styles.strategyHeader}>
                      <div style={styles.strategyTitleRow}>
                        <span style={{ ...styles.strategyIcon, backgroundColor: `${config.color}20` }}>{config.icon}</span>
                        <div>
                          <h3 style={styles.strategyName}>{config.name}</h3>
                          <p style={styles.strategyDesc}>{config.description}</p>
                        </div>
                      </div>
                      <button 
                        style={{ 
                          ...styles.toggleButton, 
                          backgroundColor: strategy?.enabled ? '#00ff88' : '#ff4444',
                          color: strategy?.enabled ? '#000' : '#fff'
                        }}
                        onClick={() => toggleStrategy(key)}
                      >
                        {strategy?.enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div style={styles.strategyStats}>
                      <div style={styles.strategyStat}>
                        <span style={styles.stratStatLabel}>Scans</span>
                        <span style={styles.stratStatValue}>{strategy?.scans || 0}</span>
                      </div>
                      <div style={styles.strategyStat}>
                        <span style={styles.stratStatLabel}>Oportunidades</span>
                        <span style={styles.stratStatValue}>{strategy?.opportunities || 0}</span>
                      </div>
                      <div style={styles.strategyStat}>
                        <span style={styles.stratStatLabel}>Ejecuciones</span>
                        <span style={styles.stratStatValue}>{strategy?.executions || 0}</span>
                      </div>
                      <div style={styles.strategyStat}>
                        <span style={styles.stratStatLabel}>Tasa Éxito</span>
                        <span style={styles.stratStatValue}>
                          {strategy?.executions ? ((strategy.executions / (strategy.opportunities || 1)) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>

                    <div style={styles.strategyOpportunities}>
                      <h4 style={styles.stratOppTitle}>Oportunidades Detectadas</h4>
                      {opps.length === 0 ? (
                        <div style={styles.noOpps}>Sin oportunidades activas</div>
                      ) : (
                        <div style={styles.oppsList}>
                          {opps.slice(0, 3).map((opp, i) => (
                            <div key={i} style={styles.oppItem}>
                              <div style={styles.oppItemLeft}>
                                <span style={styles.oppItemChain}>
                                  {CHAINS_CONFIG[opp.chain as keyof typeof CHAINS_CONFIG]?.icon} {opp.chain}
                                </span>
                                <span style={styles.oppItemRoute}>{opp.route}</span>
                              </div>
                              <div style={styles.oppItemRight}>
                                <span style={{ 
                                  ...styles.oppItemProfit, 
                                  color: opp.profitable ? '#00ff88' : '#ff4444' 
                                }}>
                                  ${formatNumber(opp.netProfitUsd)}
                                </span>
                                <span style={{ 
                                  ...styles.oppItemStatus,
                                  backgroundColor: opp.profitable ? '#00ff8820' : '#ff444420',
                                  color: opp.profitable ? '#00ff88' : '#ff4444'
                                }}>
                                  {opp.profitable ? 'Rentable' : 'No rentable'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Strategy-specific info */}
                    <div style={styles.strategyInfo}>
                      {key === 'flashLoan' && (
                        <div style={styles.infoBox}>
                          <p>💡 Flash Loans de $1k, $5k, $10k USDC via Aave V3</p>
                          <p>Fee: 0.05% | Min Profit: $0.50</p>
                        </div>
                      )}
                      {key === 'mev' && (
                        <div style={styles.infoBox}>
                          <p>💡 Detecta oportunidades de sandwich y front-running</p>
                          <p>⚠️ Requiere Flashbots para ejecución real</p>
                        </div>
                      )}
                      {key === 'triangular' && (
                        <div style={styles.infoBox}>
                          <p>💡 Ciclos: WETH→USDC→DAI→WETH, WETH→USDC→USDT→WETH</p>
                          <p>3 swaps por ciclo</p>
                        </div>
                      )}
                      {key === 'crossDex' && (
                        <div style={styles.infoBox}>
                          <p>💡 Compara precios entre Uniswap V3 y SushiSwap</p>
                          <p>Solo disponible en Arbitrum</p>
                        </div>
                      )}
                      {key === 'simpleArb' && (
                        <div style={styles.infoBox}>
                          <p>💡 Arbitraje entre fee tiers: 0.01%, 0.05%, 0.3%, 1%</p>
                          <p>WETH↔USDC en todas las chains</p>
                        </div>
                      )}
                      {key === 'liquidation' && (
                        <div style={styles.infoBox}>
                          <p>💡 Busca posiciones con Health Factor &lt; 1 en Aave</p>
                          <p>Bonus de liquidación: 5%</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CHAINS VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'chains' && (
          <div style={styles.chainsContainer}>
            <h2 style={styles.pageTitle}>⛓️ Estado de Chains</h2>
            
            <div style={styles.chainsGrid}>
              {botState?.chains?.map(chain => {
                const config = CHAINS_CONFIG[chain.chain as keyof typeof CHAINS_CONFIG];
                return (
                  <div key={chain.chain} style={{ ...styles.chainCard, borderColor: config?.color || '#333' }}>
                    <div style={styles.chainHeader}>
                      <span style={styles.chainBigIcon}>{config?.icon}</span>
                      <div>
                        <h3 style={styles.chainName}>{chain.name}</h3>
                        <span style={styles.chainId}>Chain ID: {chain.chainId}</span>
                      </div>
                      <div style={{ 
                        ...styles.chainStatus, 
                        backgroundColor: chain.connected ? '#00ff8820' : '#ff444420', 
                        color: chain.connected ? '#00ff88' : '#ff4444' 
                      }}>
                        {chain.connected ? '● Conectado' : '○ Desconectado'}
                      </div>
                    </div>
                    
                    <div style={styles.chainStats}>
                      <div style={styles.chainStat}>
                        <span style={styles.chainStatLabel}>Balance</span>
                        <span style={styles.chainStatValue}>{chain.balance || '0'} ETH</span>
                      </div>
                      <div style={styles.chainStat}>
                        <span style={styles.chainStatLabel}>USD</span>
                        <span style={styles.chainStatValue}>${formatNumber(chain.balanceUsd || 0)}</span>
                      </div>
                      <div style={styles.chainStat}>
                        <span style={styles.chainStatLabel}>ETH Price</span>
                        <span style={styles.chainStatValue}>${formatNumber(chain.ethPrice || 0)}</span>
                      </div>
                      <div style={styles.chainStat}>
                        <span style={styles.chainStatLabel}>Estado</span>
                        <span style={{ ...styles.chainStatValue, color: chain.isActive ? '#00ff88' : '#ff4444' }}>
                          {chain.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    <div style={styles.chainProtocols}>
                      <span style={styles.protocolLabel}>Protocolos:</span>
                      <div style={styles.protocolTags}>
                        <span style={styles.protocolTag}>Uniswap V3</span>
                        {chain.hasAave && <span style={styles.protocolTag}>Aave V3</span>}
                        {chain.hasSushi && <span style={styles.protocolTag}>SushiSwap</span>}
                      </div>
                    </div>

                    <a 
                      href={chain.explorer} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={styles.explorerLink}
                    >
                      Ver en Explorer →
                    </a>
                  </div>
                );
              })}
            </div>

            {/* AI Bandit Section */}
            <div style={styles.banditSection}>
              <h3 style={styles.sectionTitle}>🧠 AI Chain Selection (Thompson Sampling)</h3>
              <div style={styles.banditGrid}>
                {botState?.banditStates?.map(state => {
                  const config = CHAINS_CONFIG[state.chain as keyof typeof CHAINS_CONFIG];
                  const successRate = (state.alpha / (state.alpha + state.beta)) * 100;
                  return (
                    <div key={state.chain} style={{ ...styles.banditCard, ...(state.selected ? styles.banditCardSelected : {}) }}>
                      <div style={styles.banditHeader}>
                        <span style={styles.banditIcon}>{config?.icon}</span>
                        <span style={styles.banditChain}>{state.chain}</span>
                        {state.selected && <span style={styles.selectedBadge}>SELECCIONADO</span>}
                      </div>
                      <div style={styles.banditStats}>
                        <div style={styles.banditStat}>
                          <span style={styles.banditLabel}>Alpha (Éxitos)</span>
                          <span style={styles.banditValue}>{state.alpha.toFixed(2)}</span>
                        </div>
                        <div style={styles.banditStat}>
                          <span style={styles.banditLabel}>Beta (Fallos)</span>
                          <span style={styles.banditValue}>{state.beta.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={styles.banditBar}>
                        <div style={styles.banditBarLabel}>
                          <span>Tasa de Éxito</span>
                          <span>{successRate.toFixed(1)}%</span>
                        </div>
                        <div style={styles.banditBarTrack}>
                          <div style={{ ...styles.banditBarFill, width: `${successRate}%`, backgroundColor: config?.color || '#00ff88' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CONTRACTS VIEW - SMART CONTRACTS DESPLEGADOS */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'contracts' && (
          <div style={styles.contractsContainer}>
            <h2 style={styles.pageTitle}>📜 Smart Contracts Desplegados</h2>
            <p style={styles.pageSubtitle}>Contratos de arbitraje ejecutando en mainnet</p>
            
            {/* Deployed Contracts */}
            <div style={styles.contractsGrid}>
              {/* Base Contract - With Flash Loan! */}
              <div style={{ ...styles.contractCard, borderColor: '#0052FF', background: 'linear-gradient(135deg, rgba(0,82,255,0.1) 0%, rgba(0,40,120,0.1) 100%)' }}>
                <div style={styles.contractHeader}>
                  <div style={styles.contractChain}>
                    <span style={styles.contractChainIcon}>🔵</span>
                    <div>
                      <h3 style={styles.contractChainName}>Base</h3>
                      <span style={styles.contractChainId}>Chain ID: 8453</span>
                    </div>
                  </div>
                  <div style={{ ...styles.contractStatus, background: 'rgba(0,82,255,0.2)', color: '#0052FF' }}>
                    <span style={{ color: '#0052FF' }}>●</span> ⚡ FLASH LOAN
                  </div>
                </div>
                
                <div style={styles.contractInfo}>
                  <div style={styles.contractRow}>
                    <span style={styles.contractLabel}>MultiDexExecutor</span>
                    <div style={styles.contractAddressRow}>
                      <code style={styles.contractAddress}>0xEFC1c69D56c38FADcEf13C83CC0B57853593C496</code>
                      <a 
                        href="https://basescan.org/address/0xEFC1c69D56c38FADcEf13C83CC0B57853593C496" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.contractLink}
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                  <div style={styles.contractRow}>
                    <span style={{ ...styles.contractLabel, color: '#0052FF', fontWeight: 700 }}>⚡ FlashLoanArbitrage</span>
                    <div style={styles.contractAddressRow}>
                      <code style={{ ...styles.contractAddress, color: '#0052FF' }}>0x029e1b46b97E41cC6c454313f42C6D5b744839d1</code>
                      <a 
                        href="https://basescan.org/address/0x029e1b46b97E41cC6c454313f42C6D5b744839d1" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.contractLink}
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>
                
                <div style={styles.contractFeatures}>
                  <h4 style={styles.contractFeaturesTitle}>⚡ Flash Loans $1k-$10k:</h4>
                  <ul style={styles.contractFeaturesList}>
                    <li>⚡ Flash Loans sin colateral (Aave V3)</li>
                    <li>✅ Intra-DEX Arbitrage (fee tiers)</li>
                    <li>✅ Triangular Arbitrage</li>
                    <li>✅ Multi-Swap Atómico</li>
                    <li>✅ Profit Validation</li>
                    <li>✅ MEV Protection</li>
                  </ul>
                </div>
                
                <div style={styles.contractProtocols}>
                  <span style={{ ...styles.protocolBadge, background: 'rgba(0,82,255,0.2)', color: '#0052FF' }}>⚡ Aave V3 Flash</span>
                  <span style={styles.protocolBadge}>Uniswap V3</span>
                </div>
              </div>

              {/* Arbitrum Contract - With Flash Loan! */}
              <div style={{ ...styles.contractCard, borderColor: '#28A0F0', background: 'linear-gradient(135deg, rgba(40,160,240,0.1) 0%, rgba(20,80,120,0.1) 100%)' }}>
                <div style={styles.contractHeader}>
                  <div style={styles.contractChain}>
                    <span style={styles.contractChainIcon}>🔷</span>
                    <div>
                      <h3 style={styles.contractChainName}>Arbitrum</h3>
                      <span style={styles.contractChainId}>Chain ID: 42161</span>
                    </div>
                  </div>
                  <div style={{ ...styles.contractStatus, background: 'rgba(40,160,240,0.2)', color: '#28A0F0' }}>
                    <span style={{ color: '#28A0F0' }}>●</span> ⚡ FLASH LOAN
                  </div>
                </div>
                
                <div style={styles.contractInfo}>
                  <div style={styles.contractRow}>
                    <span style={styles.contractLabel}>MultiDexExecutor</span>
                    <div style={styles.contractAddressRow}>
                      <code style={styles.contractAddress}>0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911</code>
                      <a 
                        href="https://arbiscan.io/address/0xB09cbeeA378fa3261fFF310A2428c6D8E8D06911" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.contractLink}
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                  <div style={styles.contractRow}>
                    <span style={{ ...styles.contractLabel, color: '#28A0F0', fontWeight: 700 }}>⚡ FlashLoanArbitrage</span>
                    <div style={styles.contractAddressRow}>
                      <code style={{ ...styles.contractAddress, color: '#28A0F0' }}>0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E</code>
                      <a 
                        href="https://arbiscan.io/address/0xAdB3ae805a0f54ba4E449f3cF70eF14931e7d30E" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.contractLink}
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>
                
                <div style={styles.contractFeatures}>
                  <h4 style={styles.contractFeaturesTitle}>⚡ Flash Loans $1k-$10k:</h4>
                  <ul style={styles.contractFeaturesList}>
                    <li>⚡ Flash Loans sin colateral (Aave V3)</li>
                    <li>✅ Intra-DEX Arbitrage (fee tiers)</li>
                    <li>✅ Cross-DEX Arbitrage (Uni↔Sushi)</li>
                    <li>✅ Triangular Arbitrage</li>
                    <li>✅ Multi-Swap Atómico</li>
                    <li>✅ MEV Protection</li>
                  </ul>
                </div>
                
                <div style={styles.contractProtocols}>
                  <span style={{ ...styles.protocolBadge, background: 'rgba(40,160,240,0.2)', color: '#28A0F0' }}>⚡ Aave V3 Flash</span>
                  <span style={styles.protocolBadge}>Uniswap V3</span>
                  <span style={styles.protocolBadge}>SushiSwap</span>
                </div>
              </div>

              {/* Optimism Flash Loan Contract - NEW! */}
              <div style={{ ...styles.contractCard, borderColor: '#FF0420', background: 'linear-gradient(135deg, rgba(255,4,32,0.1) 0%, rgba(100,0,10,0.1) 100%)' }}>
                <div style={styles.contractHeader}>
                  <div style={styles.contractChain}>
                    <span style={styles.contractChainIcon}>🔴</span>
                    <div>
                      <h3 style={styles.contractChainName}>Optimism</h3>
                      <span style={styles.contractChainId}>Chain ID: 10</span>
                    </div>
                  </div>
                  <div style={{ ...styles.contractStatus, background: 'rgba(255,4,32,0.2)', color: '#FF0420' }}>
                    <span style={{ color: '#FF0420' }}>●</span> ⚡ FLASH LOAN
                  </div>
                </div>
                
                <div style={styles.contractInfo}>
                  <div style={styles.contractRow}>
                    <span style={styles.contractLabel}>FlashLoanArbitrage</span>
                    <div style={styles.contractAddressRow}>
                      <code style={{ ...styles.contractAddress, color: '#FF0420' }}>0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF</code>
                      <a 
                        href="https://optimistic.etherscan.io/address/0xb341e3152B9D99962D3bA2809BF3b58d2E2f3CAF" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.contractLink}
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>
                
                <div style={styles.contractFeatures}>
                  <h4 style={styles.contractFeaturesTitle}>⚡ Flash Loans $1k-$10k:</h4>
                  <ul style={styles.contractFeaturesList}>
                    <li>⚡ Flash Loans sin colateral (Aave V3)</li>
                    <li>✅ Intra-DEX Arbitrage (fee tiers)</li>
                    <li>✅ Cross-DEX Arbitrage (Uni↔Velodrome)</li>
                    <li>✅ Triangular Arbitrage</li>
                    <li>✅ MEV Protection</li>
                    <li>✅ Profit Validation automático</li>
                  </ul>
                </div>
                
                <div style={styles.contractProtocols}>
                  <span style={{ ...styles.protocolBadge, background: 'rgba(255,4,32,0.2)', color: '#FF0420' }}>⚡ Aave V3 Flash</span>
                  <span style={styles.protocolBadge}>Uniswap V3</span>
                  <span style={styles.protocolBadge}>Velodrome</span>
                </div>
              </div>
            </div>

            {/* Contract ABIs & Code */}
            <div style={styles.contractCodeSection}>
              <h3 style={styles.sectionTitle}>📋 Contratos Disponibles</h3>
              <div style={styles.contractCodeGrid}>
                <div style={{ ...styles.contractCodeCard, borderLeft: '3px solid #FF0420' }}>
                  <div style={styles.codeCardHeader}>
                    <span style={styles.codeCardIcon}>⚡</span>
                    <div>
                      <h4 style={styles.codeCardTitle}>FlashLoanArbitrage.sol</h4>
                      <p style={styles.codeCardDesc}>Flash Loans $1k-$10k sin colateral via Aave V3</p>
                    </div>
                  </div>
                  <div style={styles.codeCardFeatures}>
                    <span>• Préstamos sin colateral</span>
                    <span>• Arbitraje atómico</span>
                    <span>• Multi-estrategia</span>
                    <span>• MEV Protection</span>
                  </div>
                  <div style={styles.codeCardStatus}>
                    <span style={styles.codeStatusDeployed}>✅ Base</span>
                    <span style={styles.codeStatusDeployed}>✅ Arbitrum</span>
                    <span style={styles.codeStatusDeployed}>✅ Optimism</span>
                  </div>
                </div>

                <div style={styles.contractCodeCard}>
                  <div style={styles.codeCardHeader}>
                    <span style={styles.codeCardIcon}>🔄</span>
                    <div>
                      <h4 style={styles.codeCardTitle}>MultiDexExecutor.sol</h4>
                      <p style={styles.codeCardDesc}>Ejecutor multi-DEX para swaps atómicos</p>
                    </div>
                  </div>
                  <div style={styles.codeCardFeatures}>
                    <span>• Uniswap V3</span>
                    <span>• SushiSwap</span>
                    <span>• Simulación on-chain</span>
                  </div>
                  <div style={styles.codeCardStatus}>
                    <span style={styles.codeStatusDeployed}>✅ Desplegado Base</span>
                    <span style={styles.codeStatusDeployed}>✅ Desplegado Arbitrum</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategies using Contracts */}
            <div style={styles.contractStrategiesSection}>
              <h3 style={styles.sectionTitle}>🎯 Estrategias Soportadas</h3>
              <div style={styles.strategiesTable}>
                <div style={styles.strategyTableRow}>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.strategyTableIcon}>📈</span>
                    <span>Intra-DEX (Fee Tiers)</span>
                  </div>
                  <div style={styles.strategyTableCell}>WETH↔USDC entre 0.01%, 0.05%, 0.3%, 1%</div>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.chainBadge}>🔵 Base</span>
                    <span style={styles.chainBadge}>🔷 Arbitrum</span>
                    <span style={{ ...styles.chainBadge, background: 'rgba(255,4,32,0.1)', color: '#FF0420' }}>🔴 Optimism</span>
                  </div>
                </div>
                <div style={styles.strategyTableRow}>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.strategyTableIcon}>🔄</span>
                    <span>Cross-DEX</span>
                  </div>
                  <div style={styles.strategyTableCell}>Uniswap V3 ↔ SushiSwap/Velodrome</div>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.chainBadge}>🔷 Arbitrum</span>
                    <span style={{ ...styles.chainBadge, background: 'rgba(255,4,32,0.1)', color: '#FF0420' }}>🔴 Optimism</span>
                  </div>
                </div>
                <div style={styles.strategyTableRow}>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.strategyTableIcon}>🔺</span>
                    <span>Triangular</span>
                  </div>
                  <div style={styles.strategyTableCell}>WETH → USDC → DAI → WETH</div>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.chainBadge}>🔵 Base</span>
                    <span style={styles.chainBadge}>🔷 Arbitrum</span>
                    <span style={{ ...styles.chainBadge, background: 'rgba(255,4,32,0.1)', color: '#FF0420' }}>🔴 Optimism</span>
                  </div>
                </div>
                <div style={{ ...styles.strategyTableRow, background: 'linear-gradient(90deg, rgba(0,255,136,0.05) 0%, rgba(255,4,32,0.05) 100%)' }}>
                  <div style={styles.strategyTableCell}>
                    <span style={styles.strategyTableIcon}>⚡</span>
                    <span style={{ color: '#00ff88', fontWeight: 700 }}>Flash Loan Arb</span>
                  </div>
                  <div style={styles.strategyTableCell}>
                    <strong>Amplificar con $1k-$10k sin colateral</strong>
                    <br />
                    <span style={{ fontSize: '11px', color: '#888' }}>Aave V3 Flash Loans - 0.05% fee</span>
                  </div>
                  <div style={styles.strategyTableCell}>
                    <span style={{ ...styles.chainBadge, background: 'rgba(0,82,255,0.2)', color: '#0052FF', fontWeight: 700 }}>🔵 ⚡ Base</span>
                    <span style={{ ...styles.chainBadge, background: 'rgba(40,160,240,0.2)', color: '#28A0F0', fontWeight: 700 }}>🔷 ⚡ Arbitrum</span>
                    <span style={{ ...styles.chainBadge, background: 'rgba(255,4,32,0.2)', color: '#FF0420', fontWeight: 700 }}>🔴 ⚡ Optimism</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Stats */}
            <div style={styles.contractStatsSection}>
              <h3 style={styles.sectionTitle}>📊 Estadísticas de Contratos</h3>
              <div style={styles.contractStatsGrid}>
                <div style={styles.contractStatCard}>
                  <span style={styles.contractStatIcon}>📜</span>
                  <div style={styles.contractStatInfo}>
                    <span style={styles.contractStatValue}>6</span>
                    <span style={styles.contractStatLabel}>Contratos Desplegados</span>
                  </div>
                </div>
                <div style={styles.contractStatCard}>
                  <span style={styles.contractStatIcon}>⛓️</span>
                  <div style={styles.contractStatInfo}>
                    <span style={styles.contractStatValue}>3</span>
                    <span style={styles.contractStatLabel}>Chains Activas</span>
                  </div>
                </div>
                <div style={{ ...styles.contractStatCard, borderLeft: '3px solid #00ff88' }}>
                  <span style={styles.contractStatIcon}>⚡</span>
                  <div style={styles.contractStatInfo}>
                    <span style={{ ...styles.contractStatValue, color: '#00ff88' }}>3</span>
                    <span style={styles.contractStatLabel}>Flash Loan Contracts</span>
                  </div>
                </div>
                <div style={{ ...styles.contractStatCard, borderLeft: '3px solid #FF0420' }}>
                  <span style={styles.contractStatIcon}>💰</span>
                  <div style={styles.contractStatInfo}>
                    <span style={{ ...styles.contractStatValue, color: '#FF0420' }}>$30k</span>
                    <span style={styles.contractStatLabel}>Flash Loan Total</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* TRADES VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'trades' && (
          <div style={styles.tradesContainer}>
            <h2 style={styles.pageTitle}>📜 Historial de Trades</h2>
            
            <div style={styles.tradesStats}>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Total Intentos</span>
                <span style={styles.tradeStatValue}>{botState?.stats?.tradesAttempted || 0}</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Ejecutados</span>
                <span style={styles.tradeStatValue}>{botState?.stats?.tradesExecuted || 0}</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Exitosos</span>
                <span style={{ ...styles.tradeStatValue, color: '#00ff88' }}>{botState?.stats?.tradesSuccessful || 0}</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Win Rate</span>
                <span style={styles.tradeStatValue}>{formatNumber(botState?.stats?.winRate || 0)}%</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Profit Bruto</span>
                <span style={{ ...styles.tradeStatValue, color: '#00ff88' }}>${formatNumber(botState?.stats?.totalProfitUsd || 0)}</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Gas Total</span>
                <span style={{ ...styles.tradeStatValue, color: '#ff4444' }}>${formatNumber(botState?.stats?.totalGasUsd || 0)}</span>
              </div>
              <div style={styles.tradeStat}>
                <span style={styles.tradeStatLabel}>Profit Neto</span>
                <span style={{ ...styles.tradeStatValue, color: (botState?.stats?.netProfitUsd || 0) >= 0 ? '#00ff88' : '#ff4444' }}>
                  ${formatNumber(botState?.stats?.netProfitUsd || 0)}
                </span>
              </div>
            </div>

            {(!botState?.tradeLogs || botState.tradeLogs.length === 0) ? (
              <div style={styles.noTrades}>
                <p>No hay trades ejecutados aún.</p>
                <p style={styles.noTradesHint}>El bot ejecutará trades cuando encuentre oportunidades rentables.</p>
              </div>
            ) : (
              <table style={styles.tradesTable}>
                <thead>
                  <tr>
                    <th>Tiempo</th>
                    <th>Estrategia</th>
                    <th>Chain</th>
                    <th>Ruta</th>
                    <th>Amount</th>
                    <th>Profit</th>
                    <th>Gas</th>
                    <th>Neto</th>
                    <th>Estado</th>
                    <th>TX</th>
                  </tr>
                </thead>
                <tbody>
                  {botState.tradeLogs.map(trade => (
                    <tr key={trade.id}>
                      <td>{new Date(trade.timestamp).toLocaleTimeString()}</td>
                      <td>
                        <span style={styles.tradeStrategy}>
                          {STRATEGY_CONFIG[trade.strategy?.toLowerCase().replace('_', '') as keyof typeof STRATEGY_CONFIG]?.icon || '📊'} {trade.strategy}
                        </span>
                      </td>
                      <td>{CHAINS_CONFIG[trade.chain as keyof typeof CHAINS_CONFIG]?.icon} {trade.chain}</td>
                      <td style={styles.tradeRoute}>{trade.route}</td>
                      <td>{trade.amountIn}</td>
                      <td style={{ color: '#00ff88' }}>${trade.actualProfit || '0'}</td>
                      <td style={{ color: '#ff4444' }}>${trade.gasCost || '0'}</td>
                      <td style={{ color: parseFloat(trade.netProfit) >= 0 ? '#00ff88' : '#ff4444' }}>${trade.netProfit}</td>
                      <td>
                        <span style={{ 
                          ...styles.statusPill, 
                          backgroundColor: trade.status === 'success' ? '#00ff8820' : '#ff444420', 
                          color: trade.status === 'success' ? '#00ff88' : '#ff4444' 
                        }}>
                          {trade.status} {trade.simulated && '(sim)'}
                        </span>
                      </td>
                      <td>
                        {trade.txHash && !trade.txHash.startsWith('simulated') && (
                          <a 
                            href={`${CHAINS_CONFIG[trade.chain as keyof typeof CHAINS_CONFIG]?.explorer}/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.txLink}
                          >
                            🔗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeView === 'settings' && (
          <div style={styles.settingsContainer}>
            <h2 style={styles.pageTitle}>⚙️ Configuración</h2>
            
            <div style={styles.settingsGrid}>
              <div style={styles.settingCard}>
                <h3>🎯 Parámetros de Trading</h3>
                <div style={styles.settingRow}>
                  <label>Min Profit Flash Loan (USD)</label>
                  <input type="number" defaultValue="0.50" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Min Profit Simple (USD)</label>
                  <input type="number" defaultValue="0.01" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Max Slippage (bps)</label>
                  <input type="number" defaultValue="50" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>⏱️ Timing</h3>
                <div style={styles.settingRow}>
                  <label>Scan Interval (ms)</label>
                  <input type="number" defaultValue="500" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>TX Deadline (s)</label>
                  <input type="number" defaultValue="60" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>⚡ Flash Loans</h3>
                <div style={styles.settingRow}>
                  <label>Cantidades (USD)</label>
                  <input type="text" defaultValue="1000, 5000, 10000" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Fee (bps)</label>
                  <input type="number" defaultValue="5" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>🥪 MEV</h3>
                <div style={styles.settingRow}>
                  <label>Min Profit MEV (USD)</label>
                  <input type="number" defaultValue="1.00" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Sandwich Threshold (USD)</label>
                  <input type="number" defaultValue="100" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>📈 Trade Sizes (ETH)</h3>
                <div style={styles.tradeSizes}>
                  {[0.005, 0.01, 0.02, 0.05, 0.1].map(size => (
                    <label key={size} style={styles.tradeSizeLabel}>
                      <input type="checkbox" defaultChecked={size <= 0.02} />
                      <span>{size} ETH</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>⛓️ Chains Habilitados</h3>
                <div style={styles.chainToggles}>
                  {Object.entries(CHAINS_CONFIG).map(([key, config]) => (
                    <label key={key} style={styles.chainToggle}>
                      <input type="checkbox" defaultChecked={key !== 'polygon'} />
                      <span>{config.icon} {config.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button style={styles.saveButton}>💾 Guardar Configuración</button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span>Última actualización: {lastUpdate.toLocaleTimeString()}</span>
        <span>•</span>
        <span>Wallet: 0x05316B...beC8a</span>
        <span>•</span>
        <span>Mode: {botState?.mode || 'ADVANCED_MULTI_STRATEGY'}</span>
        <span>•</span>
        <span>v2.0.0</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', color: '#ffffff', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: '20px' },
  
  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
  headerLeft: {},
  headerRight: { display: 'flex', gap: '15px', alignItems: 'center' },
  title: { fontSize: '28px', fontWeight: 700, margin: 0 },
  subtitle: { color: '#888', margin: '5px 0 0 0', fontSize: '13px' },
  connectionStatus: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', fontSize: '12px' },
  connectionDot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  modeBadge: { padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },

  // Control Panel
  controlPanel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  controlButtons: { display: 'flex', gap: '10px' },
  startButtonLive: { padding: '12px 24px', background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  startButtonDry: { padding: '12px 24px', background: 'linear-gradient(135deg, #ffaa00 0%, #cc8800 100%)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  stopButton: { padding: '12px 24px', background: 'linear-gradient(135deg, #666 0%, #444 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  statsQuick: { display: 'flex', gap: '30px' },
  quickStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  quickLabel: { fontSize: '11px', color: '#888' },
  quickValue: { fontSize: '18px', fontWeight: 700 },

  // Navigation
  nav: { display: 'flex', gap: '5px', marginBottom: '20px', padding: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' },
  navButton: { padding: '12px 20px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#888', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  navButtonActive: { background: 'rgba(0,255,136,0.1)', color: '#00ff88' },

  // Content
  content: { minHeight: '600px' },

  // Dashboard
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  statsRow: { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  statIcon: { fontSize: '24px' },
  statInfo: { display: 'flex', flexDirection: 'column' },
  statLabel: { fontSize: '12px', color: '#888' },
  statValue: { fontSize: '20px', fontWeight: 700 },

  // Strategy Overview
  strategyOverview: { gridColumn: '1 / -1', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  sectionTitle: { margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 },
  strategyCards: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' },
  strategyMiniCard: { padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s' },
  strategyMiniHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  strategyMiniIcon: { fontSize: '18px' },
  strategyMiniName: { fontSize: '12px', fontWeight: 600 },
  strategyMiniStatus: { marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 },
  strategyMiniStats: { display: 'flex', justifyContent: 'space-between', fontSize: '10px' },
  miniStatLabel: { color: '#666', display: 'block' },
  miniStatValue: { fontWeight: 600, display: 'block' },
  strategyMiniOpp: { marginTop: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 700 },

  // Chains Overview
  chainsOverview: { padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  chainsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  chainMiniCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' },
  chainMiniLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  chainMiniIcon: { fontSize: '24px' },
  chainMiniName: { fontSize: '14px', fontWeight: 600, display: 'block' },
  chainMiniStatus: { fontSize: '11px', display: 'block' },
  chainMiniRight: { textAlign: 'right' },
  chainMiniBalance: { fontSize: '14px', fontWeight: 600, display: 'block' },
  chainMiniUsd: { fontSize: '12px', color: '#888', display: 'block' },
  totalBalance: { display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 },
  totalValue: { color: '#00ff88' },

  // Live Opportunities
  liveOpportunities: { padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  opportunitiesList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  noData: { textAlign: 'center', padding: '30px', color: '#666' },
  opportunityRow: { display: 'grid', gridTemplateColumns: '120px 80px 1fr 80px 40px', gap: '10px', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px' },
  oppStrategy: { display: 'flex', alignItems: 'center', gap: '6px' },
  oppChain: {},
  oppRoute: { color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  oppProfit: { textAlign: 'right', fontWeight: 600 },
  oppProfitable: { textAlign: 'center', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 },

  // Recent Activity
  recentActivity: { padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  activityFeed: { display: 'flex', flexDirection: 'column', gap: '10px' },
  activityItem: { display: 'flex', gap: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px' },
  activityTime: { color: '#666', fontFamily: 'monospace' },

  // Strategies Page
  strategiesContainer: { padding: '10px' },
  pageTitle: { margin: '0 0 5px 0', fontSize: '24px' },
  pageSubtitle: { margin: '0 0 25px 0', color: '#888', fontSize: '14px' },
  strategiesGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  strategyCard: { padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '2px solid' },
  strategyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  strategyTitleRow: { display: 'flex', gap: '15px', alignItems: 'center' },
  strategyIcon: { fontSize: '32px', padding: '10px', borderRadius: '12px' },
  strategyName: { margin: 0, fontSize: '18px', fontWeight: 700 },
  strategyDesc: { margin: '5px 0 0 0', fontSize: '12px', color: '#888' },
  toggleButton: { padding: '8px 20px', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
  strategyStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' },
  strategyStat: { display: 'flex', flexDirection: 'column', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' },
  stratStatLabel: { fontSize: '11px', color: '#666' },
  stratStatValue: { fontSize: '18px', fontWeight: 700 },
  strategyOpportunities: { marginBottom: '15px' },
  stratOppTitle: { margin: '0 0 10px 0', fontSize: '14px', color: '#888' },
  noOpps: { textAlign: 'center', padding: '20px', color: '#666', fontSize: '12px' },
  oppsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  oppItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' },
  oppItemLeft: { display: 'flex', flexDirection: 'column' },
  oppItemChain: { fontSize: '12px', fontWeight: 600 },
  oppItemRoute: { fontSize: '11px', color: '#888' },
  oppItemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  oppItemProfit: { fontSize: '14px', fontWeight: 700 },
  oppItemStatus: { fontSize: '10px', padding: '2px 8px', borderRadius: '10px' },
  strategyInfo: {},
  infoBox: { padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px', color: '#888' },

  // Chains Page
  chainsContainer: { padding: '10px' },
  chainsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  chainCard: { padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '2px solid' },
  chainHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  chainBigIcon: { fontSize: '40px' },
  chainName: { margin: 0, fontSize: '20px', fontWeight: 700 },
  chainId: { fontSize: '12px', color: '#666' },
  chainStatus: { marginLeft: 'auto', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  chainStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
  chainStat: { display: 'flex', flexDirection: 'column' },
  chainStatLabel: { fontSize: '12px', color: '#666' },
  chainStatValue: { fontSize: '16px', fontWeight: 600 },
  chainProtocols: { marginBottom: '15px' },
  protocolLabel: { fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' },
  protocolTags: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  protocolTag: { padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '11px' },
  explorerLink: { display: 'block', textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#00ff88', textDecoration: 'none', fontSize: '13px' },

  // Bandit Section
  banditSection: { marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  banditGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  banditCard: { padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' },
  banditCardSelected: { borderColor: '#00ff88', boxShadow: '0 0 30px rgba(0,255,136,0.2)' },
  banditHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  banditIcon: { fontSize: '24px' },
  banditChain: { fontSize: '16px', fontWeight: 700, textTransform: 'uppercase' },
  selectedBadge: { marginLeft: 'auto', padding: '4px 10px', background: '#00ff88', color: '#000', borderRadius: '12px', fontSize: '10px', fontWeight: 700 },
  banditStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' },
  banditStat: { display: 'flex', flexDirection: 'column' },
  banditLabel: { fontSize: '11px', color: '#666' },
  banditValue: { fontSize: '18px', fontWeight: 700 },
  banditBar: { marginTop: '10px' },
  banditBarLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' },
  banditBarTrack: { height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' },
  banditBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },

  // Trades Page
  tradesContainer: { padding: '10px' },
  tradesStats: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px', marginBottom: '25px' },
  tradeStat: { display: 'flex', flexDirection: 'column', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center' },
  tradeStatLabel: { fontSize: '11px', color: '#888' },
  tradeStatValue: { fontSize: '20px', fontWeight: 700 },
  noTrades: { textAlign: 'center', padding: '60px', color: '#666' },
  noTradesHint: { fontSize: '13px', marginTop: '10px' },
  tradesTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  tradeStrategy: { display: 'flex', alignItems: 'center', gap: '5px' },
  tradeRoute: { maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusPill: { padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 },
  txLink: { color: '#00ff88', textDecoration: 'none' },

  // Settings Page
  settingsContainer: { padding: '10px' },
  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  settingCard: { padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  settingInput: { width: '120px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  tradeSizes: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  tradeSizeLabel: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer' },
  chainToggles: { display: 'flex', flexDirection: 'column', gap: '10px' },
  chainToggle: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  saveButton: { padding: '14px 30px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '16px', cursor: 'pointer' },

  // Contracts Page
  contractsContainer: { padding: '10px' },
  contractsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' },
  contractCard: { padding: '25px', background: 'linear-gradient(135deg, rgba(0,255,136,0.05) 0%, rgba(0,100,50,0.05) 100%)', borderRadius: '16px', border: '2px solid rgba(0,255,136,0.3)' },
  contractHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  contractChain: { display: 'flex', alignItems: 'center', gap: '15px' },
  contractChainIcon: { fontSize: '40px' },
  contractChainName: { margin: 0, fontSize: '20px', fontWeight: 700 },
  contractChainId: { fontSize: '12px', color: '#888' },
  contractStatus: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0,255,136,0.1)', borderRadius: '20px', color: '#00ff88', fontSize: '12px', fontWeight: 600 },
  contractStatusDot: { color: '#00ff88' },
  contractInfo: { marginBottom: '20px' },
  contractRow: { marginBottom: '15px' },
  contractLabel: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' },
  contractAddressRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  contractAddress: { flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '11px', color: '#00ff88', fontFamily: 'monospace', wordBreak: 'break-all' },
  contractLink: { padding: '10px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', textDecoration: 'none', fontSize: '16px' },
  contractFeatures: { marginBottom: '20px' },
  contractFeaturesTitle: { margin: '0 0 10px 0', fontSize: '14px', color: '#888' },
  contractFeaturesList: { margin: 0, padding: '0 0 0 20px', fontSize: '13px', lineHeight: 1.8 },
  contractProtocols: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  protocolBadge: { padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  
  contractCodeSection: { marginBottom: '30px' },
  contractCodeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  contractCodeCard: { padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  codeCardHeader: { display: 'flex', gap: '15px', marginBottom: '15px' },
  codeCardIcon: { fontSize: '32px' },
  codeCardTitle: { margin: 0, fontSize: '16px', fontWeight: 700 },
  codeCardDesc: { margin: '5px 0 0 0', fontSize: '12px', color: '#888' },
  codeCardFeatures: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px', fontSize: '12px', color: '#aaa' },
  codeCardStatus: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  codeStatusReady: { padding: '4px 10px', background: 'rgba(255,170,0,0.1)', color: '#ffaa00', borderRadius: '10px', fontSize: '11px' },
  codeStatusPending: { padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '10px', fontSize: '11px' },
  codeStatusDeployed: { padding: '4px 10px', background: 'rgba(0,255,136,0.1)', color: '#00ff88', borderRadius: '10px', fontSize: '11px' },
  
  contractStrategiesSection: { marginBottom: '30px' },
  strategiesTable: { background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden' },
  strategyTableRow: { display: 'grid', gridTemplateColumns: '200px 1fr 200px', gap: '20px', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  strategyTableCell: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  strategyTableIcon: { fontSize: '18px' },
  chainBadge: { padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '11px' },
  
  contractStatsSection: {},
  contractStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  contractStatCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  contractStatIcon: { fontSize: '32px' },
  contractStatInfo: { display: 'flex', flexDirection: 'column' },
  contractStatValue: { fontSize: '28px', fontWeight: 700, color: '#00ff88' },
  contractStatLabel: { fontSize: '12px', color: '#888' },

  // Footer
  footer: { display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', padding: '20px', color: '#666', fontSize: '12px' }
};

export default DeFiProtocolsModule;
