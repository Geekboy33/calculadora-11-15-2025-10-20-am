// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - UI MODULE
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';

// Types
type ChainKey = 'base' | 'arbitrum' | 'optimism' | 'polygon';
type BotStatus = 'idle' | 'running' | 'paused' | 'error';

interface ChainStats {
  chain: ChainKey;
  totalTrades: number;
  successfulTrades: number;
  totalProfitUsd: number;
  totalGasUsd: number;
  netProfitUsd: number;
  winRate: number;
  avgLatencyMs: number;
}

interface BanditState {
  chain: string;
  alpha: number;
  beta: number;
  estimatedWinRate: number;
  confidence: number;
}

interface BotConfig {
  tickMs: number;
  decisionMs: number;
  minProfitUsd: number;
  gasMult: number;
  maxSlippageBps: number;
  chains: ChainKey[];
  dryRun: boolean;
}

// Chain info
const CHAIN_INFO: Record<ChainKey, { name: string; color: string; icon: string }> = {
  base: { name: 'Base', color: '#0052FF', icon: '🔵' },
  arbitrum: { name: 'Arbitrum', color: '#28A0F0', icon: '🔷' },
  optimism: { name: 'Optimism', color: '#FF0420', icon: '🔴' },
  polygon: { name: 'Polygon', color: '#8247E5', icon: '🟣' }
};

export const MultiChainArbModule: React.FC = () => {
  const [status, setStatus] = useState<BotStatus>('idle');
  const [currentChain, setCurrentChain] = useState<ChainKey>('arbitrum');
  const [chainStats, setChainStats] = useState<ChainStats[]>([]);
  const [banditState, setBanditState] = useState<BanditState[]>([]);
  const [config, setConfig] = useState<BotConfig>({
    tickMs: 700,
    decisionMs: 5000,
    minProfitUsd: 0.50,
    gasMult: 1.7,
    maxSlippageBps: 10,
    chains: ['base', 'arbitrum', 'optimism', 'polygon'],
    dryRun: true
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [uptime, setUptime] = useState(0);

  // Simulated data for demo
  useEffect(() => {
    // Initialize with demo data
    setChainStats([
      { chain: 'base', totalTrades: 45, successfulTrades: 42, totalProfitUsd: 12.50, totalGasUsd: 2.10, netProfitUsd: 10.40, winRate: 93.3, avgLatencyMs: 180 },
      { chain: 'arbitrum', totalTrades: 78, successfulTrades: 71, totalProfitUsd: 28.75, totalGasUsd: 4.20, netProfitUsd: 24.55, winRate: 91.0, avgLatencyMs: 210 },
      { chain: 'optimism', totalTrades: 32, successfulTrades: 29, totalProfitUsd: 8.90, totalGasUsd: 1.50, netProfitUsd: 7.40, winRate: 90.6, avgLatencyMs: 195 },
      { chain: 'polygon', totalTrades: 56, successfulTrades: 48, totalProfitUsd: 15.20, totalGasUsd: 0.80, netProfitUsd: 14.40, winRate: 85.7, avgLatencyMs: 250 }
    ]);

    setBanditState([
      { chain: 'base', alpha: 44, beta: 5, estimatedWinRate: 0.898, confidence: 0.85 },
      { chain: 'arbitrum', alpha: 73, beta: 9, estimatedWinRate: 0.890, confidence: 0.92 },
      { chain: 'optimism', alpha: 31, beta: 5, estimatedWinRate: 0.861, confidence: 0.78 },
      { chain: 'polygon', alpha: 50, beta: 10, estimatedWinRate: 0.833, confidence: 0.82 }
    ]);
  }, []);

  // Uptime counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running') {
      interval = setInterval(() => {
        setUptime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Simulate bot activity
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running') {
      interval = setInterval(() => {
        // Rotate chain based on "AI decision"
        const chains: ChainKey[] = ['base', 'arbitrum', 'optimism', 'polygon'];
        const randomChain = chains[Math.floor(Math.random() * chains.length)];
        setCurrentChain(randomChain);

        // Add log
        const actions = [
          `🔍 Scanning ${CHAIN_INFO[randomChain].name} for opportunities...`,
          `✅ Found candidate: USDC→WETH→USDC ($0.${Math.floor(Math.random() * 50 + 10)} profit)`,
          `🧠 AI rotated to ${CHAIN_INFO[randomChain].name} (${(Math.random() * 20 + 80).toFixed(1)}% win rate)`,
          `⏱️ Latency: ${Math.floor(Math.random() * 100 + 150)}ms`,
          `📊 Updated bandit state for ${CHAIN_INFO[randomChain].name}`
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ${randomAction}`,
          ...prev.slice(0, 49)
        ]);

        // Update stats occasionally
        if (Math.random() > 0.7) {
          setChainStats(prev => prev.map(stat => {
            if (stat.chain === randomChain) {
              const profit = Math.random() * 0.5;
              return {
                ...stat,
                totalTrades: stat.totalTrades + 1,
                successfulTrades: stat.successfulTrades + (Math.random() > 0.1 ? 1 : 0),
                totalProfitUsd: stat.totalProfitUsd + profit,
                netProfitUsd: stat.netProfitUsd + profit - 0.05
              };
            }
            return stat;
          }));
        }
      }, config.tickMs);
    }
    return () => clearInterval(interval);
  }, [status, config.tickMs]);

  const formatUptime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalProfit = chainStats.reduce((sum, s) => sum + s.netProfitUsd, 0);
  const totalTrades = chainStats.reduce((sum, s) => sum + s.totalTrades, 0);
  const avgWinRate = chainStats.length > 0
    ? chainStats.reduce((sum, s) => sum + s.winRate, 0) / chainStats.length
    : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 Multi-Chain Micro Arbitrage Bot</h1>
        <p style={styles.subtitle}>AI-Powered Chain Rotation • Gas-Positive Trading</p>
      </div>

      {/* Status Bar */}
      <div style={styles.statusBar}>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>Status:</span>
          <span style={{
            ...styles.statusValue,
            color: status === 'running' ? '#4caf50' : status === 'error' ? '#f44336' : '#ff9800'
          }}>
            {status === 'running' ? '● RUNNING' : status === 'paused' ? '⏸ PAUSED' : '○ IDLE'}
          </span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>Current Chain:</span>
          <span style={{ ...styles.statusValue, color: CHAIN_INFO[currentChain].color }}>
            {CHAIN_INFO[currentChain].icon} {CHAIN_INFO[currentChain].name}
          </span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>Uptime:</span>
          <span style={styles.statusValue}>{formatUptime(uptime)}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>Mode:</span>
          <span style={{ ...styles.statusValue, color: config.dryRun ? '#ff9800' : '#4caf50' }}>
            {config.dryRun ? '🔒 DRY RUN' : '💰 LIVE'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.button,
            backgroundColor: status === 'running' ? '#f44336' : '#4caf50'
          }}
          onClick={() => setStatus(status === 'running' ? 'paused' : 'running')}
        >
          {status === 'running' ? '⏹ Stop Bot' : '▶ Start Bot'}
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#2196f3' }}
          onClick={() => setConfig({ ...config, dryRun: !config.dryRun })}
        >
          {config.dryRun ? '🔓 Enable Live Mode' : '🔒 Enable Dry Run'}
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#9c27b0' }}
          onClick={() => {
            setBanditState(prev => prev.map(s => ({ ...s, alpha: 2, beta: 2 })));
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] 🧠 AI learning reset`, ...prev]);
          }}
        >
          🔄 Reset AI
        </button>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>💰 Total Profit</h3>
          <p style={{ ...styles.statValue, color: totalProfit >= 0 ? '#4caf50' : '#f44336' }}>
            ${totalProfit.toFixed(2)}
          </p>
        </div>
        <div style={styles.statCard}>
          <h3>📊 Total Trades</h3>
          <p style={styles.statValue}>{totalTrades}</p>
        </div>
        <div style={styles.statCard}>
          <h3>🎯 Avg Win Rate</h3>
          <p style={styles.statValue}>{avgWinRate.toFixed(1)}%</p>
        </div>
        <div style={styles.statCard}>
          <h3>⚡ Tick Interval</h3>
          <p style={styles.statValue}>{config.tickMs}ms</p>
        </div>
      </div>

      {/* Chain Performance */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📈 Chain Performance</h2>
        <div style={styles.chainGrid}>
          {chainStats.map(stat => (
            <div
              key={stat.chain}
              style={{
                ...styles.chainCard,
                borderLeft: `4px solid ${CHAIN_INFO[stat.chain].color}`,
                opacity: currentChain === stat.chain ? 1 : 0.7
              }}
            >
              <div style={styles.chainHeader}>
                <span style={styles.chainIcon}>{CHAIN_INFO[stat.chain].icon}</span>
                <span style={styles.chainName}>{CHAIN_INFO[stat.chain].name}</span>
                {currentChain === stat.chain && (
                  <span style={styles.activeBadge}>ACTIVE</span>
                )}
              </div>
              <div style={styles.chainStats}>
                <div>
                  <span style={styles.chainStatLabel}>Trades:</span>
                  <span style={styles.chainStatValue}>{stat.totalTrades}</span>
                </div>
                <div>
                  <span style={styles.chainStatLabel}>Win Rate:</span>
                  <span style={styles.chainStatValue}>{stat.winRate.toFixed(1)}%</span>
                </div>
                <div>
                  <span style={styles.chainStatLabel}>Net Profit:</span>
                  <span style={{ ...styles.chainStatValue, color: stat.netProfitUsd >= 0 ? '#4caf50' : '#f44336' }}>
                    ${stat.netProfitUsd.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={styles.chainStatLabel}>Latency:</span>
                  <span style={styles.chainStatValue}>{stat.avgLatencyMs.toFixed(0)}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Bandit State */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🧠 AI Bandit State (Thompson Sampling)</h2>
        <div style={styles.banditGrid}>
          {banditState.map(state => (
            <div key={state.chain} style={styles.banditCard}>
              <div style={styles.banditHeader}>
                <span>{CHAIN_INFO[state.chain as ChainKey]?.icon} {state.chain}</span>
              </div>
              <div style={styles.banditBar}>
                <div
                  style={{
                    ...styles.banditFill,
                    width: `${state.estimatedWinRate * 100}%`,
                    backgroundColor: CHAIN_INFO[state.chain as ChainKey]?.color
                  }}
                />
              </div>
              <div style={styles.banditStats}>
                <span>α: {state.alpha.toFixed(0)}</span>
                <span>β: {state.beta.toFixed(0)}</span>
                <span>Est: {(state.estimatedWinRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⚙️ Configuration</h2>
        <div style={styles.configGrid}>
          <div style={styles.configItem}>
            <label>Tick Interval (ms)</label>
            <input
              type="number"
              value={config.tickMs}
              onChange={e => setConfig({ ...config, tickMs: Number(e.target.value) })}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Decision Interval (ms)</label>
            <input
              type="number"
              value={config.decisionMs}
              onChange={e => setConfig({ ...config, decisionMs: Number(e.target.value) })}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Min Profit (USD)</label>
            <input
              type="number"
              step="0.01"
              value={config.minProfitUsd}
              onChange={e => setConfig({ ...config, minProfitUsd: Number(e.target.value) })}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Gas Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={config.gasMult}
              onChange={e => setConfig({ ...config, gasMult: Number(e.target.value) })}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📜 Activity Log</h2>
        <div style={styles.logContainer}>
          {logs.length === 0 ? (
            <p style={styles.logEmpty}>No activity yet. Start the bot to see logs.</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={styles.logEntry}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#0a0a1a',
    color: '#fff',
    minHeight: '100vh',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5em',
    margin: 0,
    background: 'linear-gradient(90deg, #4caf50, #2196f3, #9c27b0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#888',
    marginTop: '10px'
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    padding: '15px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusLabel: {
    color: '#888'
  },
  statusValue: {
    fontWeight: 'bold'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '30px'
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'transform 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: '#1a1a2e',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '2em',
    fontWeight: 'bold',
    margin: '10px 0'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '1.3em',
    marginBottom: '15px',
    borderBottom: '1px solid #333',
    paddingBottom: '10px'
  },
  chainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '15px'
  },
  chainCard: {
    backgroundColor: '#1a1a2e',
    padding: '15px',
    borderRadius: '8px',
    transition: 'opacity 0.3s'
  },
  chainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px'
  },
  chainIcon: {
    fontSize: '1.5em'
  },
  chainName: {
    fontWeight: 'bold',
    fontSize: '1.1em'
  },
  activeBadge: {
    backgroundColor: '#4caf50',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7em',
    marginLeft: 'auto'
  },
  chainStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  chainStatLabel: {
    color: '#888',
    fontSize: '0.9em'
  },
  chainStatValue: {
    fontWeight: 'bold',
    marginLeft: '5px'
  },
  banditGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  banditCard: {
    backgroundColor: '#1a1a2e',
    padding: '15px',
    borderRadius: '8px'
  },
  banditHeader: {
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  banditBar: {
    height: '20px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px'
  },
  banditFill: {
    height: '100%',
    transition: 'width 0.3s'
  },
  banditStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85em',
    color: '#888'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  configItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  input: {
    padding: '10px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff'
  },
  logContainer: {
    backgroundColor: '#0d0d1a',
    padding: '15px',
    borderRadius: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '0.85em'
  },
  logEmpty: {
    color: '#666',
    textAlign: 'center'
  },
  logEntry: {
    padding: '5px 0',
    borderBottom: '1px solid #1a1a2e'
  }
};

export default MultiChainArbModule;
