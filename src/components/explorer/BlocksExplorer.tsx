// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BLOCKS EXPLORER - LemonChain Block Explorer Professional Component
// Explorador de bloques en tiempo real con escaneo RPC directo
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Clock, Hash, ChevronLeft, ChevronRight, Search, RefreshCw,
  Activity, Zap, Database, Copy, Check, ExternalLink, ArrowLeft,
  Cpu, Server, HardDrive, Layers, TrendingUp, BarChart2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

interface Block {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: string[];
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  nonce: string;
  extraData: string;
  baseFeePerGas?: string;
  logsBloom?: string;
}

interface BlocksExplorerProps {
  onBack?: () => void;
  language?: 'en' | 'es';
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  en: {
    title: 'Block Explorer',
    subtitle: 'LemonChain Real-Time Blocks',
    latestBlocks: 'Latest Blocks',
    blockDetails: 'Block Details',
    blockHeight: 'Block Height',
    blockHash: 'Block Hash',
    parentHash: 'Parent Hash',
    timestamp: 'Timestamp',
    transactions: 'Transactions',
    gasUsed: 'Gas Used',
    gasLimit: 'Gas Limit',
    miner: 'Validator',
    difficulty: 'Difficulty',
    size: 'Size',
    nonce: 'Nonce',
    extraData: 'Extra Data',
    avgBlockTime: 'Avg Block Time',
    totalBlocks: 'Total Blocks',
    avgGasUsed: 'Avg Gas Used',
    networkHashrate: 'Network Activity',
    search: 'Search block by number or hash...',
    loading: 'Loading blocks...',
    noBlocks: 'No blocks found',
    back: 'Back',
    refresh: 'Refresh',
    viewAll: 'View All Transactions',
    seconds: 'seconds',
    ago: 'ago',
    txs: 'txs',
    bytes: 'bytes',
    copied: 'Copied!',
    gasEfficiency: 'Gas Efficiency',
    blockReward: 'Block Reward',
    networkStats: 'Network Statistics',
    recentActivity: 'Recent Activity',
    blocksPerMin: 'Blocks/min',
    avgTxPerBlock: 'Avg Tx/Block'
  },
  es: {
    title: 'Explorador de Bloques',
    subtitle: 'Bloques en Tiempo Real de LemonChain',
    latestBlocks: 'Últimos Bloques',
    blockDetails: 'Detalles del Bloque',
    blockHeight: 'Altura del Bloque',
    blockHash: 'Hash del Bloque',
    parentHash: 'Hash Padre',
    timestamp: 'Marca de Tiempo',
    transactions: 'Transacciones',
    gasUsed: 'Gas Usado',
    gasLimit: 'Límite de Gas',
    miner: 'Validador',
    difficulty: 'Dificultad',
    size: 'Tamaño',
    nonce: 'Nonce',
    extraData: 'Datos Extra',
    avgBlockTime: 'Tiempo Promedio de Bloque',
    totalBlocks: 'Total de Bloques',
    avgGasUsed: 'Gas Promedio Usado',
    networkHashrate: 'Actividad de Red',
    search: 'Buscar bloque por número o hash...',
    loading: 'Cargando bloques...',
    noBlocks: 'No se encontraron bloques',
    back: 'Volver',
    refresh: 'Actualizar',
    viewAll: 'Ver Todas las Transacciones',
    seconds: 'segundos',
    ago: 'hace',
    txs: 'txs',
    bytes: 'bytes',
    copied: '¡Copiado!',
    gasEfficiency: 'Eficiencia de Gas',
    blockReward: 'Recompensa de Bloque',
    networkStats: 'Estadísticas de Red',
    recentActivity: 'Actividad Reciente',
    blocksPerMin: 'Bloques/min',
    avgTxPerBlock: 'Tx/Bloque Promedio'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const explorerStyles = `
  .blocks-explorer {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%);
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    padding: 24px;
  }

  .blocks-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .blocks-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #a78bfa;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .back-btn:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
  }

  .blocks-title-section h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .blocks-title-section p {
    color: #8b949e;
    margin: 4px 0 0 0;
    font-size: 14px;
  }

  .blocks-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-container {
    position: relative;
    width: 320px;
  }

  .search-input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    background: rgba(22, 27, 34, 0.8);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 10px;
    color: #e6edf3;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }

  .search-input:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #8b949e;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 10px;
    color: #a78bfa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: rgba(139, 92, 246, 0.2);
    transform: rotate(180deg);
  }

  .refresh-btn.spinning svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
  }

  .stat-card:hover {
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #facc15, #f59e0b);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover::before {
    opacity: 1;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(245, 158, 11, 0.15));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: #facc15;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #e6edf3;
    margin-bottom: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .stat-label {
    font-size: 13px;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-change {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
  }

  .stat-change.positive {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .stat-change.negative {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  /* Main Content */
  .blocks-content {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;
  }

  @media (max-width: 1200px) {
    .blocks-content {
      grid-template-columns: 1fr;
    }
  }

  /* Blocks Table */
  .blocks-table-container {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  }

  .table-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: #e6edf3;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  .table-header h2 svg {
    color: #facc15;
  }

  .live-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #22c55e;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .blocks-table {
    width: 100%;
    border-collapse: collapse;
  }

  .blocks-table th {
    text-align: left;
    padding: 14px 20px;
    font-size: 12px;
    font-weight: 600;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(13, 17, 23, 0.5);
    border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  }

  .blocks-table td {
    padding: 16px 20px;
    font-size: 14px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.05);
    vertical-align: middle;
  }

  .blocks-table tr {
    transition: background 0.2s;
    cursor: pointer;
  }

  .blocks-table tr:hover {
    background: rgba(139, 92, 246, 0.05);
  }

  .blocks-table tr.selected {
    background: rgba(139, 92, 246, 0.1);
  }

  .block-number {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .block-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(245, 158, 11, 0.15));
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #facc15;
  }

  .block-num-text {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-weight: 600;
    color: #a78bfa;
  }

  .block-hash {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #8b949e;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .block-txs {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tx-count {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
  }

  .tx-count.zero {
    background: rgba(139, 92, 246, 0.1);
    color: #8b949e;
  }

  .block-time {
    font-size: 13px;
    color: #8b949e;
  }

  .block-gas {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
  }

  .gas-bar {
    width: 80px;
    height: 6px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 4px;
  }

  .gas-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #facc15, #ef4444);
    border-radius: 3px;
    transition: width 0.3s;
  }

  .block-validator {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #a78bfa;
  }

  /* Block Details Panel */
  .block-details-panel {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    height: fit-content;
    position: sticky;
    top: 24px;
  }

  .details-header {
    padding: 20px 24px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  }

  .details-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #e6edf3;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .details-header p {
    font-size: 13px;
    color: #8b949e;
    margin: 0;
  }

  .details-content {
    padding: 20px 24px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid rgba(139, 92, 246, 0.05);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 13px;
    color: #8b949e;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .detail-value {
    font-size: 13px;
    color: #e6edf3;
    font-family: 'SF Mono', 'Fira Code', monospace;
    text-align: right;
    word-break: break-all;
    max-width: 200px;
  }

  .detail-value.hash {
    color: #a78bfa;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-value.hash:hover {
    color: #c4b5fd;
  }

  .copy-btn {
    padding: 4px;
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    transition: color 0.2s;
  }

  .copy-btn:hover {
    color: #facc15;
  }

  .view-txs-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(245, 158, 11, 0.15));
    border: 1px solid rgba(250, 204, 21, 0.3);
    border-radius: 10px;
    color: #facc15;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }

  .view-txs-btn:hover {
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(245, 158, 11, 0.25));
    transform: translateY(-1px);
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    border-top: 1px solid rgba(139, 92, 246, 0.1);
  }

  .page-btn {
    padding: 8px 14px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 8px;
    color: #a78bfa;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .page-btn:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.4);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 13px;
    color: #8b949e;
    padding: 0 16px;
  }

  /* Network Activity Chart */
  .network-activity {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    padding: 20px;
    margin-top: 24px;
  }

  .activity-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .activity-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #e6edf3;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }

  .activity-chart {
    height: 120px;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 10px 0;
  }

  .activity-bar {
    flex: 1;
    background: linear-gradient(180deg, rgba(250, 204, 21, 0.8), rgba(139, 92, 246, 0.4));
    border-radius: 4px 4px 0 0;
    min-height: 8px;
    transition: height 0.3s, opacity 0.3s;
    position: relative;
  }

  .activity-bar:hover {
    opacity: 0.8;
  }

  .activity-bar::after {
    content: attr(data-value);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: #8b949e;
    padding: 2px 4px;
    background: rgba(13, 17, 23, 0.9);
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    white-space: nowrap;
  }

  .activity-bar:hover::after {
    opacity: 1;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #8b949e;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(139, 92, 246, 0.2);
    border-top-color: #a78bfa;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #8b949e;
  }

  .empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  @media (max-width: 768px) {
    .blocks-explorer {
      padding: 16px;
    }

    .blocks-header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-container {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .blocks-table th:nth-child(3),
    .blocks-table td:nth-child(3),
    .blocks-table th:nth-child(5),
    .blocks-table td:nth-child(5) {
      display: none;
    }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

export const BlocksExplorer: React.FC<BlocksExplorerProps> = ({
  onBack,
  language = 'en'
}) => {
  const t = TRANSLATIONS[language];
  
  // State
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [latestBlockNumber, setLatestBlockNumber] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [networkActivity, setNetworkActivity] = useState<number[]>([]);
  
  const blocksPerPage = 15;

  // Fetch block by number
  const fetchBlock = useCallback(async (blockNumber: number): Promise<Block | null> => {
    try {
      const response = await fetch(LEMONCHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [`0x${blockNumber.toString(16)}`, false],
          id: 1
        })
      });
      
      const data = await response.json();
      if (data.result) {
        const block = data.result;
        return {
          number: parseInt(block.number, 16),
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: parseInt(block.timestamp, 16),
          transactions: block.transactions || [],
          transactionCount: block.transactions?.length || 0,
          gasUsed: block.gasUsed,
          gasLimit: block.gasLimit,
          miner: block.miner,
          difficulty: block.difficulty || '0x0',
          totalDifficulty: block.totalDifficulty || '0x0',
          size: parseInt(block.size, 16),
          nonce: block.nonce || '0x0',
          extraData: block.extraData || '0x',
          baseFeePerGas: block.baseFeePerGas,
          logsBloom: block.logsBloom
        };
      }
      return null;
    } catch (e) {
      console.error('Error fetching block:', e);
      return null;
    }
  }, []);

  // Fetch latest block number
  const fetchLatestBlockNumber = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(LEMONCHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const data = await response.json();
      return parseInt(data.result, 16);
    } catch (e) {
      console.error('Error fetching block number:', e);
      return 0;
    }
  }, []);

  // Fetch blocks for current page
  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await fetchLatestBlockNumber();
      setLatestBlockNumber(latest);
      
      const startBlock = latest - ((currentPage - 1) * blocksPerPage);
      const endBlock = Math.max(startBlock - blocksPerPage + 1, 0);
      
      const blockPromises: Promise<Block | null>[] = [];
      for (let i = startBlock; i >= endBlock; i--) {
        blockPromises.push(fetchBlock(i));
      }
      
      const fetchedBlocks = await Promise.all(blockPromises);
      const validBlocks = fetchedBlocks.filter((b): b is Block => b !== null);
      setBlocks(validBlocks);
      
      if (!selectedBlock && validBlocks.length > 0) {
        setSelectedBlock(validBlocks[0]);
      }
      
      // Generate network activity data
      const activity = validBlocks.map(b => b.transactionCount);
      setNetworkActivity(activity);
      
    } catch (e) {
      console.error('Error fetching blocks:', e);
    }
    setLoading(false);
  }, [currentPage, fetchBlock, fetchLatestBlockNumber, selectedBlock]);

  // Refresh blocks
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlocks();
    setRefreshing(false);
  }, [fetchBlocks]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = Math.floor(now - timestamp);
    if (diff < 60) return `${diff} ${t.seconds} ${t.ago}`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ${t.ago}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ${t.ago}`;
    return new Date(timestamp * 1000).toLocaleString();
  }, [t]);

  // Format gas
  const formatGas = useCallback((gas: string) => {
    const gasNum = parseInt(gas, 16);
    if (gasNum >= 1000000) return `${(gasNum / 1000000).toFixed(2)}M`;
    if (gasNum >= 1000) return `${(gasNum / 1000).toFixed(1)}K`;
    return gasNum.toString();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    if (blocks.length === 0) return null;
    
    const totalTxs = blocks.reduce((sum, b) => sum + b.transactionCount, 0);
    const totalGas = blocks.reduce((sum, b) => sum + parseInt(b.gasUsed, 16), 0);
    const avgGas = totalGas / blocks.length;
    const avgTxsPerBlock = totalTxs / blocks.length;
    
    // Avg block time
    const timestamps = blocks.map(b => b.timestamp).sort((a, b) => b - a);
    let avgBlockTime = 0;
    if (timestamps.length > 1) {
      const timeDiffs = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        timeDiffs.push(timestamps[i] - timestamps[i + 1]);
      }
      avgBlockTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    }
    
    return {
      totalBlocks: latestBlockNumber,
      avgBlockTime: avgBlockTime.toFixed(1),
      avgGasUsed: formatGas(`0x${Math.floor(avgGas).toString(16)}`),
      avgTxsPerBlock: avgTxsPerBlock.toFixed(1),
      blocksPerMin: avgBlockTime > 0 ? (60 / avgBlockTime).toFixed(1) : '0'
    };
  }, [blocks, latestBlockNumber, formatGas]);

  // Search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      let block: Block | null = null;
      
      if (searchQuery.startsWith('0x')) {
        // Search by hash
        const response = await fetch(LEMONCHAIN_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByHash',
            params: [searchQuery, false],
            id: 1
          })
        });
        const data = await response.json();
        if (data.result) {
          block = {
            number: parseInt(data.result.number, 16),
            hash: data.result.hash,
            parentHash: data.result.parentHash,
            timestamp: parseInt(data.result.timestamp, 16),
            transactions: data.result.transactions || [],
            transactionCount: data.result.transactions?.length || 0,
            gasUsed: data.result.gasUsed,
            gasLimit: data.result.gasLimit,
            miner: data.result.miner,
            difficulty: data.result.difficulty || '0x0',
            totalDifficulty: data.result.totalDifficulty || '0x0',
            size: parseInt(data.result.size, 16),
            nonce: data.result.nonce || '0x0',
            extraData: data.result.extraData || '0x'
          };
        }
      } else {
        // Search by number
        const blockNum = parseInt(searchQuery);
        if (!isNaN(blockNum)) {
          block = await fetchBlock(blockNum);
        }
      }
      
      if (block) {
        setSelectedBlock(block);
        setBlocks([block]);
      }
    } catch (e) {
      console.error('Search error:', e);
    }
    setLoading(false);
  }, [searchQuery, fetchBlock]);

  // Gas percentage
  const getGasPercentage = useCallback((gasUsed: string, gasLimit: string) => {
    const used = parseInt(gasUsed, 16);
    const limit = parseInt(gasLimit, 16);
    return limit > 0 ? (used / limit) * 100 : 0;
  }, []);

  return (
    <>
      <style>{explorerStyles}</style>
      <div className="blocks-explorer">
        {/* Header */}
        <div className="blocks-header">
          <div className="blocks-header-left">
            {onBack && (
              <button className="back-btn" onClick={onBack} title={t.back} aria-label={t.back}>
                <ArrowLeft size={18} />
                {t.back}
              </button>
            )}
            <div className="blocks-title-section">
              <h1>
                <Layers size={28} />
                {t.title}
              </h1>
              <p>{t.subtitle}</p>
            </div>
          </div>
          
          <div className="blocks-header-right">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title={t.refresh}
              aria-label={t.refresh}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Layers size={24} />
              </div>
              <div className="stat-value">{stats.totalBlocks.toLocaleString()}</div>
              <div className="stat-label">{t.totalBlocks}</div>
              <div className="stat-change positive">
                <TrendingUp size={12} />
                +{stats.blocksPerMin}/min
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-value">{stats.avgBlockTime}s</div>
              <div className="stat-label">{t.avgBlockTime}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Zap size={24} />
              </div>
              <div className="stat-value">{stats.avgGasUsed}</div>
              <div className="stat-label">{t.avgGasUsed}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Activity size={24} />
              </div>
              <div className="stat-value">{stats.avgTxsPerBlock}</div>
              <div className="stat-label">{t.avgTxPerBlock}</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="blocks-content">
          {/* Blocks Table */}
          <div className="blocks-table-container">
            <div className="table-header">
              <h2>
                <Box size={20} />
                {t.latestBlocks}
              </h2>
              <div className="live-indicator">
                <span className="live-dot"></span>
                Live
              </div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>{t.loading}</span>
              </div>
            ) : blocks.length === 0 ? (
              <div className="empty-state">
                <Box size={48} />
                <p>{t.noBlocks}</p>
              </div>
            ) : (
              <>
                <table className="blocks-table">
                  <thead>
                    <tr>
                      <th>{t.blockHeight}</th>
                      <th>{t.blockHash}</th>
                      <th>{t.transactions}</th>
                      <th>{t.gasUsed}</th>
                      <th>{t.miner}</th>
                      <th>{t.timestamp}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((block) => (
                      <tr 
                        key={block.hash}
                        className={selectedBlock?.hash === block.hash ? 'selected' : ''}
                        onClick={() => setSelectedBlock(block)}
                      >
                        <td>
                          <div className="block-number">
                            <div className="block-icon">
                              <Box size={16} />
                            </div>
                            <span className="block-num-text">#{block.number.toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <span className="block-hash">{block.hash.slice(0, 10)}...{block.hash.slice(-8)}</span>
                        </td>
                        <td>
                          <div className="block-txs">
                            <span className={`tx-count ${block.transactionCount === 0 ? 'zero' : ''}`}>
                              {block.transactionCount} {t.txs}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="block-gas">
                            {formatGas(block.gasUsed)}
                            <div className="gas-bar">
                              <div 
                                className="gas-fill" 
                                style={{ width: `${getGasPercentage(block.gasUsed, block.gasLimit)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="block-validator">
                            {block.miner.slice(0, 8)}...{block.miner.slice(-6)}
                          </span>
                        </td>
                        <td>
                          <span className="block-time">{formatTime(block.timestamp)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                <div className="pagination">
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {Math.ceil(latestBlockNumber / blocksPerPage)}
                  </span>
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * blocksPerPage >= latestBlockNumber}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Block Details Panel */}
          {selectedBlock && (
            <div className="block-details-panel">
              <div className="details-header">
                <h3>
                  <Hash size={18} />
                  {t.blockDetails}
                </h3>
                <p>Block #{selectedBlock.number.toLocaleString()}</p>
              </div>
              
              <div className="details-content">
                <div className="detail-row">
                  <span className="detail-label">
                    <Layers size={14} />
                    {t.blockHeight}
                  </span>
                  <span className="detail-value">{selectedBlock.number.toLocaleString()}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Hash size={14} />
                    {t.blockHash}
                  </span>
                  <span className="detail-value hash" onClick={() => copyToClipboard(selectedBlock.hash, 'hash')}>
                    {selectedBlock.hash.slice(0, 12)}...{selectedBlock.hash.slice(-10)}
                    <button className="copy-btn" title="Copy" aria-label="Copy hash">
                      {copied === 'hash' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Clock size={14} />
                    {t.timestamp}
                  </span>
                  <span className="detail-value">
                    {new Date(selectedBlock.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Activity size={14} />
                    {t.transactions}
                  </span>
                  <span className="detail-value">{selectedBlock.transactionCount}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Zap size={14} />
                    {t.gasUsed}
                  </span>
                  <span className="detail-value">
                    {parseInt(selectedBlock.gasUsed, 16).toLocaleString()}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Database size={14} />
                    {t.gasLimit}
                  </span>
                  <span className="detail-value">
                    {parseInt(selectedBlock.gasLimit, 16).toLocaleString()}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Server size={14} />
                    {t.miner}
                  </span>
                  <span className="detail-value hash" onClick={() => copyToClipboard(selectedBlock.miner, 'miner')}>
                    {selectedBlock.miner.slice(0, 10)}...{selectedBlock.miner.slice(-8)}
                    <button className="copy-btn" title="Copy" aria-label="Copy miner address">
                      {copied === 'miner' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <HardDrive size={14} />
                    {t.size}
                  </span>
                  <span className="detail-value">{selectedBlock.size.toLocaleString()} {t.bytes}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">
                    <Hash size={14} />
                    {t.parentHash}
                  </span>
                  <span className="detail-value hash" onClick={() => copyToClipboard(selectedBlock.parentHash, 'parent')}>
                    {selectedBlock.parentHash.slice(0, 10)}...{selectedBlock.parentHash.slice(-8)}
                    <button className="copy-btn" title="Copy" aria-label="Copy parent hash">
                      {copied === 'parent' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </span>
                </div>
                
                {selectedBlock.transactionCount > 0 && (
                  <button className="view-txs-btn">
                    <ExternalLink size={16} />
                    {t.viewAll} ({selectedBlock.transactionCount})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Network Activity Chart */}
        {networkActivity.length > 0 && (
          <div className="network-activity">
            <div className="activity-header">
              <h3>
                <BarChart2 size={18} />
                {t.recentActivity}
              </h3>
              <span className="live-indicator">
                <span className="live-dot"></span>
                {blocks.length} {t.latestBlocks}
              </span>
            </div>
            <div className="activity-chart">
              {networkActivity.map((value, index) => {
                const maxValue = Math.max(...networkActivity, 1);
                const height = (value / maxValue) * 100;
                return (
                  <div 
                    key={index}
                    className="activity-bar"
                    style={{ height: `${Math.max(height, 8)}%` }}
                    data-value={`${value} txs`}
                  ></div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlocksExplorer;
