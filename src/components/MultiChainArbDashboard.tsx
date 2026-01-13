// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN ARBITRAGE BOT DASHBOARD
// Real-time visualization with AI-powered chain rotation
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainStatus {
  chain: string;
  name: string;
  chainId: number;
  balance: string;
  balanceUsd: number;
  routes: number;
  isActive: boolean;
  lastTick: number;
  explorer: string;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  winRate: number;
  selected: boolean;
}

interface TradeLog {
  id: string;
  timestamp: number;
  chain: string;
  route: string;
  amountIn: number;
  amountOut: number;
  profit: number;
  gasCost: number;
  netProfit: number;
  txHash?: string;
  status: 'success' | 'failed' | 'pending';
}

interface BotStats {
  totalTicks: number;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  uptime: number;
  currentChain: string;
}

interface Opportunity {
  chain: string;
  route: string;
  spreadBps: number;
  potentialProfit: number;
  gasCost: number;
  netProfit: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CHAINS_CONFIG = {
  base: {
    name: 'Base',
    chainId: 8453,
    color: '#0052FF',
    icon: '🔵',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    color: '#28A0F0',
    icon: '🔷',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    color: '#FF0420',
    icon: '🔴',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    color: '#8247E5',
    icon: '🟣',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export const MultiChainArbDashboard: React.FC = () => {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [chains, setChains] = useState<ChainStatus[]>([]);
  const [banditStates, setBanditStates] = useState<BanditState[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<BotStats>({
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  });
  const [selectedTab, setSelectedTab] = useState<'overview' | 'chains' | 'ai' | 'trades' | 'settings'>('overview');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // ─────────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────────

  const fetchBotStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/defi/multichain-arb/status');
      if (response.ok) {
        const data = await response.json();
        setChains(data.chains || []);
        setBanditStates(data.banditStates || []);
        setStats(data.stats || stats);
        setIsRunning(data.isRunning || false);
        setLastUpdate(new Date());
      }
    } catch (error) {
      // Simulate data for demo
      simulateData();
    }
  }, []);

  const simulateData = () => {
    // Simulate chain statuses
    const simulatedChains: ChainStatus[] = [
      {
        chain: 'base',
        name: 'Base',
        chainId: 8453,
        balance: '0.033309',
        balanceUsd: 116.58,
        routes: 5,
        isActive: true,
        lastTick: Date.now() - Math.random() * 5000,
        explorer: 'https://basescan.org'
      },
      {
        chain: 'arbitrum',
        name: 'Arbitrum',
        chainId: 42161,
        balance: '0.027770',
        balanceUsd: 97.20,
        routes: 6,
        isActive: true,
        lastTick: Date.now() - Math.random() * 5000,
        explorer: 'https://arbiscan.io'
      },
      {
        chain: 'optimism',
        name: 'Optimism',
        chainId: 10,
        balance: '0.023800',
        balanceUsd: 83.30,
        routes: 5,
        isActive: true,
        lastTick: Date.now() - Math.random() * 5000,
        explorer: 'https://optimistic.etherscan.io'
      }
    ];
    setChains(simulatedChains);

    // Simulate AI bandit states
    const simulatedBandit: BanditState[] = [
      { chain: 'base', alpha: 5 + Math.random() * 3, beta: 2 + Math.random(), winRate: 65 + Math.random() * 10, selected: stats.currentChain === 'base' },
      { chain: 'arbitrum', alpha: 4 + Math.random() * 2, beta: 3 + Math.random(), winRate: 55 + Math.random() * 15, selected: stats.currentChain === 'arbitrum' },
      { chain: 'optimism', alpha: 3 + Math.random() * 2, beta: 2 + Math.random(), winRate: 60 + Math.random() * 10, selected: stats.currentChain === 'optimism' }
    ];
    setBanditStates(simulatedBandit);

    // Simulate opportunities
    if (Math.random() > 0.7) {
      const newOpp: Opportunity = {
        chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
        route: 'USDC-WETH-USDC 500/3000',
        spreadBps: Math.random() * 50,
        potentialProfit: Math.random() * 5,
        gasCost: Math.random() * 0.5,
        netProfit: Math.random() * 4.5,
        timestamp: Date.now()
      };
      setOpportunities(prev => [newOpp, ...prev.slice(0, 9)]);
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalTicks: prev.totalTicks + 1,
      uptime: Math.floor((Date.now() - startTimeRef.current) / 1000),
      currentChain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)]
    }));

    setLastUpdate(new Date());
  };

  // ─────────────────────────────────────────────────────────────────────────────────
  // BOT CONTROLS
  // ─────────────────────────────────────────────────────────────────────────────────

  const startBot = async () => {
    try {
      const response = await fetch('/api/defi/multichain-arb/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: isDryRun })
      });
      if (response.ok) {
        setIsRunning(true);
        startTimeRef.current = Date.now();
      }
    } catch (error) {
      // Demo mode
      setIsRunning(true);
      startTimeRef.current = Date.now();
    }
  };

  const stopBot = async () => {
    try {
      await fetch('/api/defi/multichain-arb/stop', { method: 'POST' });
    } catch (error) {
      // Demo mode
    }
    setIsRunning(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBotStatus();
    intervalRef.current = setInterval(fetchBotStatus, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBotStatus]);

  // ─────────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────────

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // ─────────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>🤖</span>
            Multi-Chain Arbitrage Bot
          </h1>
          <p style={styles.subtitle}>AI-Powered Chain Rotation (Thompson Sampling)</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusBadge}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: isRunning ? '#00ff88' : '#ff4444'
            }} />
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </div>
          <div style={styles.modeBadge}>
            {isDryRun ? '🔒 DRY RUN' : '🔴 LIVE'}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.controlButtons}>
          {!isRunning ? (
            <button style={styles.startButton} onClick={startBot}>
              ▶️ Start Bot
            </button>
          ) : (
            <button style={styles.stopButton} onClick={stopBot}>
              ⏹️ Stop Bot
            </button>
          )}
          <label style={styles.dryRunToggle}>
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              disabled={isRunning}
            />
            <span>Dry Run Mode</span>
          </label>
        </div>
        <div style={styles.uptimeDisplay}>
          <span style={styles.uptimeLabel}>Uptime:</span>
          <span style={styles.uptimeValue}>{formatUptime(stats.uptime)}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'chains', 'ai', 'trades', 'settings'] as const).map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(selectedTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setSelectedTab(tab)}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'chains' && '⛓️ Chains'}
            {tab === 'ai' && '🧠 AI Bandit'}
            {tab === 'trades' && '📜 Trade Log'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div style={styles.overviewGrid}>
            {/* Stats Cards */}
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📈</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Total Ticks</span>
                  <span style={styles.statValue}>{stats.totalTicks.toLocaleString()}</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Net Profit</span>
                  <span style={{
                    ...styles.statValue,
                    color: stats.netProfitUsd >= 0 ? '#00ff88' : '#ff4444'
                  }}>
                    ${formatNumber(stats.netProfitUsd)}
                  </span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🎯</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Win Rate</span>
                  <span style={styles.statValue}>{formatNumber(stats.winRate)}%</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>⛓️</div>
                <div style={styles.statInfo}>
                  <span style={styles.statLabel}>Current Chain</span>
                  <span style={styles.statValue}>
                    {CHAINS_CONFIG[stats.currentChain as keyof typeof CHAINS_CONFIG]?.icon} {stats.currentChain}
                  </span>
                </div>
              </div>
            </div>

            {/* Chain Balances */}
            <div style={styles.balancesCard}>
              <h3 style={styles.cardTitle}>💰 Chain Balances</h3>
              <div style={styles.balancesList}>
                {chains.map(chain => (
                  <div key={chain.chain} style={styles.balanceItem}>
                    <div style={styles.balanceChain}>
                      <span style={styles.chainIcon}>
                        {CHAINS_CONFIG[chain.chain as keyof typeof CHAINS_CONFIG]?.icon}
                      </span>
                      <span>{chain.name}</span>
                    </div>
                    <div style={styles.balanceAmount}>
                      <span style={styles.ethBalance}>{chain.balance} ETH</span>
                      <span style={styles.usdBalance}>${formatNumber(chain.balanceUsd)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.totalBalance}>
                <span>Total:</span>
                <span style={styles.totalValue}>
                  ${formatNumber(chains.reduce((sum, c) => sum + c.balanceUsd, 0))}
                </span>
              </div>
            </div>

            {/* Live Opportunities */}
            <div style={styles.opportunitiesCard}>
              <h3 style={styles.cardTitle}>🔍 Live Opportunities</h3>
              <div style={styles.opportunitiesList}>
                {opportunities.length === 0 ? (
                  <div style={styles.noOpportunities}>
                    Scanning for opportunities...
                  </div>
                ) : (
                  opportunities.slice(0, 5).map((opp, i) => (
                    <div key={i} style={styles.opportunityItem}>
                      <div style={styles.oppChain}>
                        {CHAINS_CONFIG[opp.chain as keyof typeof CHAINS_CONFIG]?.icon} {opp.chain}
                      </div>
                      <div style={styles.oppRoute}>{opp.route}</div>
                      <div style={styles.oppSpread}>{formatNumber(opp.spreadBps)} bps</div>
                      <div style={{
                        ...styles.oppProfit,
                        color: opp.netProfit > 0 ? '#00ff88' : '#ff4444'
                      }}>
                        ${formatNumber(opp.netProfit)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div style={styles.activityCard}>
              <h3 style={styles.cardTitle}>📡 Activity Feed</h3>
              <div style={styles.activityFeed}>
                <div style={styles.activityItem}>
                  <span style={styles.activityTime}>{lastUpdate.toLocaleTimeString()}</span>
                  <span style={styles.activityText}>
                    🔄 AI rotated to <strong>{stats.currentChain}</strong>
                  </span>
                </div>
                <div style={styles.activityItem}>
                  <span style={styles.activityTime}>{new Date(Date.now() - 2000).toLocaleTimeString()}</span>
                  <span style={styles.activityText}>
                    📊 Tick #{stats.totalTicks} completed
                  </span>
                </div>
                <div style={styles.activityItem}>
                  <span style={styles.activityTime}>{new Date(Date.now() - 5000).toLocaleTimeString()}</span>
                  <span style={styles.activityText}>
                    🔍 Scanning {chains.reduce((sum, c) => sum + c.routes, 0)} routes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chains Tab */}
        {selectedTab === 'chains' && (
          <div style={styles.chainsGrid}>
            {chains.map(chain => {
              const config = CHAINS_CONFIG[chain.chain as keyof typeof CHAINS_CONFIG];
              return (
                <div key={chain.chain} style={{
                  ...styles.chainCard,
                  borderColor: config?.color || '#333'
                }}>
                  <div style={styles.chainHeader}>
                    <span style={styles.chainBigIcon}>{config?.icon}</span>
                    <div>
                      <h3 style={styles.chainName}>{chain.name}</h3>
                      <span style={styles.chainId}>Chain ID: {chain.chainId}</span>
                    </div>
                    <div style={{
                      ...styles.chainStatus,
                      backgroundColor: chain.isActive ? '#00ff8820' : '#ff444420',
                      color: chain.isActive ? '#00ff88' : '#ff4444'
                    }}>
                      {chain.isActive ? '● Active' : '○ Inactive'}
                    </div>
                  </div>
                  <div style={styles.chainStats}>
                    <div style={styles.chainStat}>
                      <span style={styles.chainStatLabel}>Balance</span>
                      <span style={styles.chainStatValue}>{chain.balance} ETH</span>
                    </div>
                    <div style={styles.chainStat}>
                      <span style={styles.chainStatLabel}>USD Value</span>
                      <span style={styles.chainStatValue}>${formatNumber(chain.balanceUsd)}</span>
                    </div>
                    <div style={styles.chainStat}>
                      <span style={styles.chainStatLabel}>Routes</span>
                      <span style={styles.chainStatValue}>{chain.routes}</span>
                    </div>
                    <div style={styles.chainStat}>
                      <span style={styles.chainStatLabel}>Last Tick</span>
                      <span style={styles.chainStatValue}>
                        {Math.floor((Date.now() - chain.lastTick) / 1000)}s ago
                      </span>
                    </div>
                  </div>
                  <a
                    href={chain.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.explorerLink}
                  >
                    View on Explorer →
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Bandit Tab */}
        {selectedTab === 'ai' && (
          <div style={styles.aiContainer}>
            <div style={styles.aiHeader}>
              <h2 style={styles.aiTitle}>🧠 Thompson Sampling (Multi-Armed Bandit)</h2>
              <p style={styles.aiDescription}>
                The AI learns which chain provides the best arbitrage opportunities over time.
                Higher alpha = more successes, higher beta = more failures.
              </p>
            </div>

            <div style={styles.banditGrid}>
              {banditStates.map(state => {
                const config = CHAINS_CONFIG[state.chain as keyof typeof CHAINS_CONFIG];
                const successRate = (state.alpha / (state.alpha + state.beta)) * 100;
                
                return (
                  <div key={state.chain} style={{
                    ...styles.banditCard,
                    ...(state.selected ? styles.banditCardSelected : {})
                  }}>
                    <div style={styles.banditHeader}>
                      <span style={styles.banditIcon}>{config?.icon}</span>
                      <span style={styles.banditChain}>{state.chain}</span>
                      {state.selected && (
                        <span style={styles.selectedBadge}>SELECTED</span>
                      )}
                    </div>
                    
                    <div style={styles.banditStats}>
                      <div style={styles.banditStat}>
                        <span style={styles.banditLabel}>Alpha (Successes)</span>
                        <span style={styles.banditValue}>{state.alpha.toFixed(2)}</span>
                      </div>
                      <div style={styles.banditStat}>
                        <span style={styles.banditLabel}>Beta (Failures)</span>
                        <span style={styles.banditValue}>{state.beta.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={styles.banditBar}>
                      <div style={styles.banditBarLabel}>
                        <span>Success Rate</span>
                        <span>{successRate.toFixed(1)}%</span>
                      </div>
                      <div style={styles.banditBarTrack}>
                        <div style={{
                          ...styles.banditBarFill,
                          width: `${successRate}%`,
                          backgroundColor: config?.color || '#00ff88'
                        }} />
                      </div>
                    </div>

                    <div style={styles.banditWinRate}>
                      <span>Estimated Win Rate:</span>
                      <span style={{
                        color: state.winRate > 60 ? '#00ff88' : state.winRate > 40 ? '#ffaa00' : '#ff4444'
                      }}>
                        {state.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.aiExplanation}>
              <h3>How it works:</h3>
              <ol>
                <li>Each chain starts with equal probability (alpha=2, beta=2)</li>
                <li>When a profitable opportunity is found, alpha increases</li>
                <li>When no opportunity is found, beta increases</li>
                <li>The AI samples from Beta(alpha, beta) to decide which chain to focus on</li>
                <li>This naturally balances exploration vs exploitation</li>
              </ol>
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {selectedTab === 'trades' && (
          <div style={styles.tradesContainer}>
            <h2 style={styles.tradesTitle}>📜 Trade History</h2>
            
            {tradeLogs.length === 0 ? (
              <div style={styles.noTrades}>
                <p>No trades executed yet.</p>
                <p style={styles.noTradesHint}>
                  The bot will execute trades when profitable opportunities are found.
                </p>
              </div>
            ) : (
              <table style={styles.tradesTable}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Chain</th>
                    <th>Route</th>
                    <th>Amount In</th>
                    <th>Amount Out</th>
                    <th>Profit</th>
                    <th>Gas</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeLogs.map(trade => (
                    <tr key={trade.id}>
                      <td>{new Date(trade.timestamp).toLocaleTimeString()}</td>
                      <td>{trade.chain}</td>
                      <td>{trade.route}</td>
                      <td>${formatNumber(trade.amountIn)}</td>
                      <td>${formatNumber(trade.amountOut)}</td>
                      <td style={{ color: '#00ff88' }}>${formatNumber(trade.profit)}</td>
                      <td style={{ color: '#ff4444' }}>${formatNumber(trade.gasCost)}</td>
                      <td style={{ color: trade.netProfit >= 0 ? '#00ff88' : '#ff4444' }}>
                        ${formatNumber(trade.netProfit)}
                      </td>
                      <td>
                        <span style={{
                          ...styles.statusPill,
                          backgroundColor: trade.status === 'success' ? '#00ff8820' : '#ff444420',
                          color: trade.status === 'success' ? '#00ff88' : '#ff4444'
                        }}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <div style={styles.settingsContainer}>
            <h2 style={styles.settingsTitle}>⚙️ Bot Settings</h2>
            
            <div style={styles.settingsGrid}>
              <div style={styles.settingCard}>
                <h3>Trading Parameters</h3>
                <div style={styles.settingRow}>
                  <label>Min Profit (USD)</label>
                  <input type="number" defaultValue="0.50" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Max Slippage (bps)</label>
                  <input type="number" defaultValue="50" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>Gas Multiplier</label>
                  <input type="number" defaultValue="1.7" step="0.1" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>Timing</h3>
                <div style={styles.settingRow}>
                  <label>Tick Interval (ms)</label>
                  <input type="number" defaultValue="700" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>AI Decision Interval (ms)</label>
                  <input type="number" defaultValue="5000" style={styles.settingInput} />
                </div>
                <div style={styles.settingRow}>
                  <label>TX Deadline (seconds)</label>
                  <input type="number" defaultValue="60" style={styles.settingInput} />
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>Trade Sizes (USD)</h3>
                <div style={styles.tradeSizes}>
                  {[25, 50, 100, 250, 500, 1000].map(size => (
                    <label key={size} style={styles.tradeSizeLabel}>
                      <input type="checkbox" defaultChecked />
                      <span>${size}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.settingCard}>
                <h3>Enabled Chains</h3>
                <div style={styles.chainToggles}>
                  {Object.entries(CHAINS_CONFIG).map(([key, config]) => (
                    <label key={key} style={styles.chainToggle}>
                      <input 
                        type="checkbox" 
                        defaultChecked={key !== 'polygon'} 
                      />
                      <span>{config.icon} {config.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button style={styles.saveButton}>
              💾 Save Settings
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
        <span>•</span>
        <span>Wallet: 0x05316B...beC8a</span>
        <span>•</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    color: '#ffffff',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  headerLeft: {},
  headerRight: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  titleIcon: {
    fontSize: '32px'
  },
  subtitle: {
    color: '#888',
    margin: '5px 0 0 0',
    fontSize: '14px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  modeBadge: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  controlPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  controlButtons: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  startButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  stopButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  dryRunToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  uptimeDisplay: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  uptimeLabel: {
    color: '#888',
    fontSize: '14px'
  },
  uptimeValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '18px',
    fontWeight: 600,
    color: '#00ff88'
  },
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '20px',
    padding: '5px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px'
  },
  tab: {
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabActive: {
    background: 'rgba(0,255,136,0.1)',
    color: '#00ff88'
  },
  content: {
    minHeight: '500px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  statsRow: {
    gridColumn: '1 / -1',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  statIcon: {
    fontSize: '24px'
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  statLabel: {
    fontSize: '12px',
    color: '#888'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700
  },
  balancesCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  cardTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600
  },
  balancesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  balanceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px'
  },
  balanceChain: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  chainIcon: {
    fontSize: '18px'
  },
  balanceAmount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  ethBalance: {
    fontSize: '14px',
    fontWeight: 600
  },
  usdBalance: {
    fontSize: '12px',
    color: '#888'
  },
  totalBalance: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    fontWeight: 600
  },
  totalValue: {
    color: '#00ff88'
  },
  opportunitiesCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  opportunitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  noOpportunities: {
    textAlign: 'center',
    padding: '30px',
    color: '#666'
  },
  opportunityItem: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 80px 80px',
    gap: '10px',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    fontSize: '13px'
  },
  oppChain: {},
  oppRoute: {
    color: '#888'
  },
  oppSpread: {
    textAlign: 'right'
  },
  oppProfit: {
    textAlign: 'right',
    fontWeight: 600
  },
  activityCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  activityFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  activityItem: {
    display: 'flex',
    gap: '15px',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    fontSize: '13px'
  },
  activityTime: {
    color: '#666',
    fontFamily: 'monospace'
  },
  activityText: {},
  chainsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  chainCard: {
    padding: '25px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '2px solid',
    transition: 'transform 0.2s'
  },
  chainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  },
  chainBigIcon: {
    fontSize: '40px'
  },
  chainName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700
  },
  chainId: {
    fontSize: '12px',
    color: '#666'
  },
  chainStatus: {
    marginLeft: 'auto',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  chainStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px'
  },
  chainStat: {
    display: 'flex',
    flexDirection: 'column'
  },
  chainStatLabel: {
    fontSize: '12px',
    color: '#666'
  },
  chainStatValue: {
    fontSize: '16px',
    fontWeight: 600
  },
  explorerLink: {
    display: 'block',
    textAlign: 'center',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    color: '#00ff88',
    textDecoration: 'none',
    fontSize: '13px'
  },
  aiContainer: {
    padding: '20px'
  },
  aiHeader: {
    marginBottom: '30px'
  },
  aiTitle: {
    margin: '0 0 10px 0',
    fontSize: '24px'
  },
  aiDescription: {
    color: '#888',
    fontSize: '14px',
    lineHeight: 1.6
  },
  banditGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  banditCard: {
    padding: '25px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '2px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s'
  },
  banditCardSelected: {
    borderColor: '#00ff88',
    boxShadow: '0 0 30px rgba(0,255,136,0.2)'
  },
  banditHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  banditIcon: {
    fontSize: '28px'
  },
  banditChain: {
    fontSize: '18px',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  selectedBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    background: '#00ff88',
    color: '#000',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 700
  },
  banditStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px'
  },
  banditStat: {
    display: 'flex',
    flexDirection: 'column'
  },
  banditLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '4px'
  },
  banditValue: {
    fontSize: '20px',
    fontWeight: 700
  },
  banditBar: {
    marginBottom: '15px'
  },
  banditBarLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '8px'
  },
  banditBarTrack: {
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  banditBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  banditWinRate: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: 600
  },
  aiExplanation: {
    padding: '25px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  tradesContainer: {
    padding: '20px'
  },
  tradesTitle: {
    margin: '0 0 20px 0'
  },
  noTrades: {
    textAlign: 'center',
    padding: '60px',
    color: '#666'
  },
  noTradesHint: {
    fontSize: '13px',
    marginTop: '10px'
  },
  tradesTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  statusPill: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600
  },
  settingsContainer: {
    padding: '20px'
  },
  settingsTitle: {
    margin: '0 0 25px 0'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  settingCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  settingInput: {
    width: '100px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px'
  },
  tradeSizes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  tradeSizeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  chainToggles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  chainToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '14px 30px',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '30px',
    padding: '20px',
    color: '#666',
    fontSize: '12px'
  }
};

export default MultiChainArbDashboard;
