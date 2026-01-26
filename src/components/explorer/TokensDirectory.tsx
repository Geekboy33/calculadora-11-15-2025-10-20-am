// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TOKENS DIRECTORY - LemonChain Token Registry Professional Component
// Directorio completo de tokens con métricas, holdings y análisis
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coins, Search, RefreshCw, Copy, Check, ExternalLink, ArrowLeft,
  TrendingUp, TrendingDown, Wallet, Users, Activity, BarChart2,
  Star, StarOff, Filter, ChevronDown, Grid, List, Zap, Shield,
  Clock, Hash, Database, Eye, ArrowUpRight, ArrowDownRight,
  PieChart, DollarSign, Percent, Globe
} from 'lucide-react';
import { CONTRACT_ADDRESSES_V5 } from '../../lib/blockchain/auto-connect-service';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyFormatted: string;
  holders?: number;
  transfers?: number;
  price?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  verified: boolean;
  type: 'native' | 'erc20' | 'stablecoin' | 'governance' | 'utility';
  logo?: string;
  description?: string;
  website?: string;
  isFavorite?: boolean;
}

interface TokenHolder {
  address: string;
  balance: string;
  percentage: number;
  rank: number;
}

interface TokensDirectoryProps {
  onBack?: () => void;
  language?: 'en' | 'es';
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  en: {
    title: 'Token Directory',
    subtitle: 'LemonChain Token Registry',
    search: 'Search tokens by name, symbol or address...',
    totalTokens: 'Total Tokens',
    verifiedTokens: 'Verified',
    totalHolders: 'Total Holders',
    totalTransfers: 'Total Transfers',
    marketCap: 'Market Cap',
    volume24h: '24h Volume',
    price: 'Price',
    priceChange: '24h Change',
    holders: 'Holders',
    transfers: 'Transfers',
    supply: 'Total Supply',
    decimals: 'Decimals',
    contract: 'Contract',
    type: 'Type',
    allTokens: 'All Tokens',
    stablecoins: 'Stablecoins',
    governance: 'Governance',
    utility: 'Utility',
    favorites: 'Favorites',
    tokenDetails: 'Token Details',
    topHolders: 'Top Holders',
    recentTransfers: 'Recent Transfers',
    back: 'Back',
    refresh: 'Refresh',
    viewContract: 'View Contract',
    addToWallet: 'Add to Wallet',
    loading: 'Loading tokens...',
    noTokens: 'No tokens found',
    verified: 'Verified',
    unverified: 'Unverified',
    copied: 'Copied!',
    native: 'Native',
    erc20: 'ERC-20',
    stablecoin: 'Stablecoin',
    rank: 'Rank',
    balance: 'Balance',
    percentage: 'Share',
    sortBy: 'Sort by',
    name: 'Name',
    gridView: 'Grid View',
    listView: 'List View',
    website: 'Website',
    description: 'Description'
  },
  es: {
    title: 'Directorio de Tokens',
    subtitle: 'Registro de Tokens de LemonChain',
    search: 'Buscar tokens por nombre, símbolo o dirección...',
    totalTokens: 'Total de Tokens',
    verifiedTokens: 'Verificados',
    totalHolders: 'Total de Holders',
    totalTransfers: 'Total de Transferencias',
    marketCap: 'Cap. de Mercado',
    volume24h: 'Volumen 24h',
    price: 'Precio',
    priceChange: 'Cambio 24h',
    holders: 'Holders',
    transfers: 'Transferencias',
    supply: 'Suministro Total',
    decimals: 'Decimales',
    contract: 'Contrato',
    type: 'Tipo',
    allTokens: 'Todos los Tokens',
    stablecoins: 'Stablecoins',
    governance: 'Gobernanza',
    utility: 'Utilidad',
    favorites: 'Favoritos',
    tokenDetails: 'Detalles del Token',
    topHolders: 'Principales Holders',
    recentTransfers: 'Transferencias Recientes',
    back: 'Volver',
    refresh: 'Actualizar',
    viewContract: 'Ver Contrato',
    addToWallet: 'Agregar a Wallet',
    loading: 'Cargando tokens...',
    noTokens: 'No se encontraron tokens',
    verified: 'Verificado',
    unverified: 'No Verificado',
    copied: '¡Copiado!',
    native: 'Nativo',
    erc20: 'ERC-20',
    stablecoin: 'Stablecoin',
    rank: 'Ranking',
    balance: 'Balance',
    percentage: 'Porcentaje',
    sortBy: 'Ordenar por',
    name: 'Nombre',
    gridView: 'Vista de Cuadrícula',
    listView: 'Vista de Lista',
    website: 'Sitio Web',
    description: 'Descripción'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const directoryStyles = `
  .tokens-directory {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%);
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    padding: 24px;
  }

  .tokens-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .tokens-header-left {
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

  .tokens-title-section h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tokens-title-section p {
    color: #8b949e;
    margin: 4px 0 0 0;
    font-size: 14px;
  }

  .tokens-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-container {
    position: relative;
    width: 360px;
  }

  .search-input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    background: rgba(22, 27, 34, 0.8);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 10px;
    color: #e6edf3;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }

  .search-input:focus {
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #8b949e;
  }

  .view-toggle {
    display: flex;
    background: rgba(22, 27, 34, 0.8);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 10px;
    overflow: hidden;
  }

  .view-btn {
    padding: 10px 14px;
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-btn.active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .view-btn:hover:not(.active) {
    background: rgba(34, 197, 94, 0.1);
    color: #a3e635;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 10px;
    color: #22c55e;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: rgba(34, 197, 94, 0.2);
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
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
  }

  .stat-card:hover {
    border-color: rgba(34, 197, 94, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.15);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #22c55e, #10b981);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover::before {
    opacity: 1;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    color: #22c55e;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #e6edf3;
    margin-bottom: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .stat-label {
    font-size: 12px;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Filter Tabs */
  .filter-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .filter-tab {
    padding: 10px 20px;
    background: rgba(22, 27, 34, 0.8);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 10px;
    color: #8b949e;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-tab:hover {
    background: rgba(34, 197, 94, 0.1);
    color: #a3e635;
    border-color: rgba(34, 197, 94, 0.3);
  }

  .filter-tab.active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.5);
  }

  .filter-count {
    background: rgba(34, 197, 94, 0.3);
    color: #22c55e;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }

  /* Main Content */
  .tokens-content {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 24px;
  }

  @media (max-width: 1200px) {
    .tokens-content {
      grid-template-columns: 1fr;
    }
  }

  /* Token Grid */
  .tokens-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .token-card {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }

  .token-card:hover {
    border-color: rgba(34, 197, 94, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.2);
  }

  .token-card.selected {
    border-color: rgba(34, 197, 94, 0.6);
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
  }

  .token-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }

  .token-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: #22c55e;
    overflow: hidden;
  }

  .token-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .token-info {
    flex: 1;
  }

  .token-name {
    font-size: 16px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .verified-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #22c55e, #10b981);
    border-radius: 50%;
    color: white;
  }

  .token-symbol {
    font-size: 13px;
    color: #8b949e;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .token-favorite {
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    padding: 8px;
    transition: all 0.2s;
  }

  .token-favorite:hover {
    color: #facc15;
  }

  .token-favorite.active {
    color: #facc15;
  }

  .token-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .token-stat {
    background: rgba(13, 17, 23, 0.5);
    border-radius: 10px;
    padding: 12px;
  }

  .token-stat-label {
    font-size: 11px;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .token-stat-value {
    font-size: 15px;
    font-weight: 600;
    color: #e6edf3;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .token-price {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid rgba(34, 197, 94, 0.1);
  }

  .token-price-value {
    font-size: 18px;
    font-weight: 700;
    color: #e6edf3;
  }

  .token-price-change {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 8px;
  }

  .token-price-change.positive {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .token-price-change.negative {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .token-type-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .token-type-badge.native {
    background: rgba(250, 204, 21, 0.15);
    color: #facc15;
  }

  .token-type-badge.stablecoin {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .token-type-badge.governance {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }

  .token-type-badge.utility {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .token-type-badge.erc20 {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }

  /* Token List View */
  .tokens-list {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 16px;
    overflow: hidden;
  }

  .tokens-table {
    width: 100%;
    border-collapse: collapse;
  }

  .tokens-table th {
    text-align: left;
    padding: 14px 20px;
    font-size: 12px;
    font-weight: 600;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(13, 17, 23, 0.5);
    border-bottom: 1px solid rgba(34, 197, 94, 0.1);
  }

  .tokens-table td {
    padding: 16px 20px;
    font-size: 14px;
    border-bottom: 1px solid rgba(34, 197, 94, 0.05);
    vertical-align: middle;
  }

  .tokens-table tr {
    transition: background 0.2s;
    cursor: pointer;
  }

  .tokens-table tr:hover {
    background: rgba(34, 197, 94, 0.05);
  }

  .tokens-table tr.selected {
    background: rgba(34, 197, 94, 0.1);
  }

  /* Token Details Panel */
  .token-details-panel {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 16px;
    height: fit-content;
    position: sticky;
    top: 24px;
    overflow: hidden;
  }

  .details-header {
    padding: 24px;
    border-bottom: 1px solid rgba(34, 197, 94, 0.1);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .details-logo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: #22c55e;
  }

  .details-info h3 {
    font-size: 20px;
    font-weight: 600;
    color: #e6edf3;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .details-info p {
    font-size: 14px;
    color: #8b949e;
    margin: 0;
  }

  .details-content {
    padding: 20px 24px;
  }

  .detail-section {
    margin-bottom: 24px;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section-title {
    font-size: 13px;
    font-weight: 600;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(34, 197, 94, 0.05);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 13px;
    color: #8b949e;
  }

  .detail-value {
    font-size: 13px;
    color: #e6edf3;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .detail-value.address {
    color: #22c55e;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-value.address:hover {
    color: #4ade80;
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
    color: #22c55e;
  }

  /* Holders List */
  .holders-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .holder-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(34, 197, 94, 0.05);
  }

  .holder-item:last-child {
    border-bottom: none;
  }

  .holder-rank {
    width: 24px;
    height: 24px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #22c55e;
  }

  .holder-address {
    flex: 1;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #a78bfa;
  }

  .holder-balance {
    font-size: 12px;
    color: #e6edf3;
    text-align: right;
  }

  .holder-percentage {
    font-size: 11px;
    color: #8b949e;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid rgba(34, 197, 94, 0.1);
  }

  .action-btn {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .action-btn.primary {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
    border: 1px solid rgba(34, 197, 94, 0.4);
    color: #22c55e;
  }

  .action-btn.primary:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3));
  }

  .action-btn.secondary {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #a78bfa;
  }

  .action-btn.secondary:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  /* Loading & Empty States */
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
    border: 3px solid rgba(34, 197, 94, 0.2);
    border-top-color: #22c55e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

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
    .tokens-directory {
      padding: 16px;
    }

    .tokens-header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-container {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .tokens-grid {
      grid-template-columns: 1fr;
    }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// KNOWN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const KNOWN_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    name: 'LemonChain',
    symbol: 'LEMX',
    decimals: 18,
    totalSupply: '1000000000000000000000000000',
    totalSupplyFormatted: '1,000,000,000',
    holders: 15420,
    transfers: 892341,
    price: 1807.68,
    priceChange24h: 42.0,
    marketCap: 1807680000000,
    volume24h: 125000000,
    verified: true,
    type: 'native',
    description: 'Native token of LemonChain blockchain'
  },
  {
    address: CONTRACT_ADDRESSES_V5.VUSD,
    name: 'VUSD Stablecoin',
    symbol: 'VUSD',
    decimals: 18,
    totalSupply: '0',
    totalSupplyFormatted: '0',
    holders: 0,
    transfers: 0,
    price: 1.00,
    priceChange24h: 0.01,
    verified: true,
    type: 'stablecoin',
    description: 'USD-backed stablecoin minted through LemonMinted protocol'
  },
  {
    address: CONTRACT_ADDRESSES_V5.USDTokenized,
    name: 'Tokenized USD',
    symbol: 'tUSD',
    decimals: 6,
    totalSupply: '0',
    totalSupplyFormatted: '0',
    holders: 0,
    transfers: 0,
    price: 1.00,
    priceChange24h: 0.00,
    verified: true,
    type: 'stablecoin',
    description: 'First signature token for USD tokenization from DAES'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

export const TokensDirectory: React.FC<TokensDirectoryProps> = ({
  onBack,
  language = 'en'
}) => {
  const t = TRANSLATIONS[language];
  
  // State
  const [tokens, setTokens] = useState<Token[]>(KNOWN_TOKENS);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copied, setCopied] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [topHolders, setTopHolders] = useState<TokenHolder[]>([]);

  // Fetch token data
  const fetchTokenData = useCallback(async (tokenAddress: string): Promise<Partial<Token> | null> => {
    try {
      // Get total supply
      const supplyResponse = await fetch(LEMONCHAIN_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x18160ddd' // totalSupply()
          }, 'latest'],
          id: 1
        })
      });
      
      const supplyData = await supplyResponse.json();
      const totalSupply = supplyData.result || '0x0';
      
      return {
        totalSupply,
        totalSupplyFormatted: (parseInt(totalSupply, 16) / 1e18).toLocaleString()
      };
    } catch (e) {
      console.error('Error fetching token data:', e);
      return null;
    }
  }, []);

  // Load tokens
  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const updatedTokens = await Promise.all(
        KNOWN_TOKENS.map(async (token) => {
          if (token.address === '0x0000000000000000000000000000000000000000') {
            return token;
          }
          const data = await fetchTokenData(token.address);
          return data ? { ...token, ...data } : token;
        })
      );
      
      setTokens(updatedTokens);
      if (!selectedToken) {
        setSelectedToken(updatedTokens[0]);
      }
    } catch (e) {
      console.error('Error loading tokens:', e);
    }
    setLoading(false);
  }, [fetchTokenData, selectedToken]);

  // Initial load
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTokens();
    setRefreshing(false);
  }, [loadTokens]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((address: string) => {
    setFavorites(prev => {
      const newFavs = new Set(prev);
      if (newFavs.has(address)) {
        newFavs.delete(address);
      } else {
        newFavs.add(address);
      }
      return newFavs;
    });
  }, []);

  // Filter tokens
  const filteredTokens = useMemo(() => {
    let result = tokens;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(token =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'favorites') {
        result = result.filter(token => favorites.has(token.address));
      } else {
        result = result.filter(token => token.type === activeFilter);
      }
    }
    
    return result;
  }, [tokens, searchQuery, activeFilter, favorites]);

  // Stats
  const stats = useMemo(() => ({
    totalTokens: tokens.length,
    verifiedTokens: tokens.filter(t => t.verified).length,
    totalHolders: tokens.reduce((sum, t) => sum + (t.holders || 0), 0),
    totalTransfers: tokens.reduce((sum, t) => sum + (t.transfers || 0), 0)
  }), [tokens]);

  // Generate mock top holders
  useEffect(() => {
    if (selectedToken) {
      const mockHolders: TokenHolder[] = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        balance: (Math.random() * 1000000).toFixed(2),
        percentage: Math.max(1, 30 - i * 3 + Math.random() * 2),
        rank: i + 1
      }));
      setTopHolders(mockHolders);
    }
  }, [selectedToken]);

  return (
    <>
      <style>{directoryStyles}</style>
      <div className="tokens-directory">
        {/* Header */}
        <div className="tokens-header">
          <div className="tokens-header-left">
            {onBack && (
              <button className="back-btn" onClick={onBack} title={t.back} aria-label={t.back}>
                <ArrowLeft size={18} />
                {t.back}
              </button>
            )}
            <div className="tokens-title-section">
              <h1>
                <Coins size={28} />
                {t.title}
              </h1>
              <p>{t.subtitle}</p>
            </div>
          </div>
          
          <div className="tokens-header-right">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={t.gridView}
                aria-label={t.gridView}
              >
                <Grid size={18} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title={t.listView}
                aria-label={t.listView}
              >
                <List size={18} />
              </button>
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
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Coins size={22} />
            </div>
            <div className="stat-value">{stats.totalTokens}</div>
            <div className="stat-label">{t.totalTokens}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={22} />
            </div>
            <div className="stat-value">{stats.verifiedTokens}</div>
            <div className="stat-label">{t.verifiedTokens}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={22} />
            </div>
            <div className="stat-value">{stats.totalHolders.toLocaleString()}</div>
            <div className="stat-label">{t.totalHolders}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={22} />
            </div>
            <div className="stat-value">{stats.totalTransfers.toLocaleString()}</div>
            <div className="stat-label">{t.totalTransfers}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            {t.allTokens}
            <span className="filter-count">{tokens.length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'stablecoin' ? 'active' : ''}`}
            onClick={() => setActiveFilter('stablecoin')}
          >
            {t.stablecoins}
            <span className="filter-count">{tokens.filter(t => t.type === 'stablecoin').length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'native' ? 'active' : ''}`}
            onClick={() => setActiveFilter('native')}
          >
            {t.native}
            <span className="filter-count">{tokens.filter(t => t.type === 'native').length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveFilter('favorites')}
          >
            <Star size={14} />
            {t.favorites}
            <span className="filter-count">{favorites.size}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="tokens-content">
          {/* Token Grid/List */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>{t.loading}</span>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="empty-state">
              <Coins size={48} />
              <p>{t.noTokens}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="tokens-grid">
              {filteredTokens.map((token) => (
                <div 
                  key={token.address}
                  className={`token-card ${selectedToken?.address === token.address ? 'selected' : ''}`}
                  onClick={() => setSelectedToken(token)}
                >
                  <span className={`token-type-badge ${token.type}`}>
                    {token.type}
                  </span>
                  
                  <div className="token-header">
                    <div className="token-logo">
                      {token.logo ? (
                        <img src={token.logo} alt={token.name} />
                      ) : (
                        token.symbol.slice(0, 2)
                      )}
                    </div>
                    <div className="token-info">
                      <div className="token-name">
                        {token.name}
                        {token.verified && (
                          <span className="verified-badge">
                            <Check size={10} />
                          </span>
                        )}
                      </div>
                      <div className="token-symbol">{token.symbol}</div>
                    </div>
                    <button 
                      className={`token-favorite ${favorites.has(token.address) ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(token.address); }}
                      title="Toggle favorite"
                      aria-label="Toggle favorite"
                    >
                      {favorites.has(token.address) ? <Star size={18} /> : <StarOff size={18} />}
                    </button>
                  </div>
                  
                  <div className="token-stats">
                    <div className="token-stat">
                      <div className="token-stat-label">{t.supply}</div>
                      <div className="token-stat-value">{token.totalSupplyFormatted}</div>
                    </div>
                    <div className="token-stat">
                      <div className="token-stat-label">{t.holders}</div>
                      <div className="token-stat-value">{(token.holders || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {token.price && (
                    <div className="token-price">
                      <span className="token-price-value">${token.price.toLocaleString()}</span>
                      {token.priceChange24h !== undefined && (
                        <span className={`token-price-change ${token.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                          {token.priceChange24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(token.priceChange24h).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="tokens-list">
              <table className="tokens-table">
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.price}</th>
                    <th>{t.priceChange}</th>
                    <th>{t.supply}</th>
                    <th>{t.holders}</th>
                    <th>{t.type}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token) => (
                    <tr 
                      key={token.address}
                      className={selectedToken?.address === token.address ? 'selected' : ''}
                      onClick={() => setSelectedToken(token)}
                    >
                      <td>
                        <div className="token-header" style={{ marginBottom: 0 }}>
                          <div className="token-logo" style={{ width: 36, height: 36 }}>
                            {token.symbol.slice(0, 2)}
                          </div>
                          <div className="token-info">
                            <div className="token-name" style={{ fontSize: 14 }}>
                              {token.name}
                              {token.verified && (
                                <span className="verified-badge" style={{ width: 14, height: 14 }}>
                                  <Check size={8} />
                                </span>
                              )}
                            </div>
                            <div className="token-symbol">{token.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td>${token.price?.toLocaleString() || '0.00'}</td>
                      <td>
                        {token.priceChange24h !== undefined && (
                          <span className={`token-price-change ${token.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td>{token.totalSupplyFormatted}</td>
                      <td>{(token.holders || 0).toLocaleString()}</td>
                      <td>
                        <span className={`token-type-badge ${token.type}`} style={{ position: 'relative' }}>
                          {token.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Token Details Panel */}
          {selectedToken && (
            <div className="token-details-panel">
              <div className="details-header">
                <div className="details-logo">
                  {selectedToken.logo ? (
                    <img src={selectedToken.logo} alt={selectedToken.name} />
                  ) : (
                    selectedToken.symbol.slice(0, 2)
                  )}
                </div>
                <div className="details-info">
                  <h3>
                    {selectedToken.name}
                    {selectedToken.verified && (
                      <span className="verified-badge">
                        <Check size={12} />
                      </span>
                    )}
                  </h3>
                  <p>{selectedToken.symbol} • {selectedToken.type}</p>
                </div>
              </div>
              
              <div className="details-content">
                <div className="detail-section">
                  <div className="detail-section-title">
                    <Database size={14} />
                    Token Information
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.contract}</span>
                    <span 
                      className="detail-value address" 
                      onClick={() => copyToClipboard(selectedToken.address, 'address')}
                    >
                      {selectedToken.address === '0x0000000000000000000000000000000000000000' 
                        ? 'Native'
                        : `${selectedToken.address.slice(0, 10)}...${selectedToken.address.slice(-8)}`
                      }
                      {selectedToken.address !== '0x0000000000000000000000000000000000000000' && (
                        <button className="copy-btn" title="Copy" aria-label="Copy address">
                          {copied === 'address' ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      )}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.decimals}</span>
                    <span className="detail-value">{selectedToken.decimals}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.supply}</span>
                    <span className="detail-value">{selectedToken.totalSupplyFormatted}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.holders}</span>
                    <span className="detail-value">{(selectedToken.holders || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.transfers}</span>
                    <span className="detail-value">{(selectedToken.transfers || 0).toLocaleString()}</span>
                  </div>
                </div>

                {selectedToken.description && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <Eye size={14} />
                      {t.description}
                    </div>
                    <p style={{ fontSize: 13, color: '#8b949e', margin: 0, lineHeight: 1.6 }}>
                      {selectedToken.description}
                    </p>
                  </div>
                )}

                <div className="detail-section">
                  <div className="detail-section-title">
                    <Users size={14} />
                    {t.topHolders}
                  </div>
                  <div className="holders-list">
                    {topHolders.slice(0, 5).map((holder) => (
                      <div key={holder.address} className="holder-item">
                        <span className="holder-rank">#{holder.rank}</span>
                        <span className="holder-address">
                          {holder.address.slice(0, 8)}...{holder.address.slice(-6)}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div className="holder-balance">{parseFloat(holder.balance).toLocaleString()}</div>
                          <div className="holder-percentage">{holder.percentage.toFixed(2)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="action-buttons">
                <button className="action-btn primary">
                  <ExternalLink size={16} />
                  {t.viewContract}
                </button>
                <button className="action-btn secondary">
                  <Wallet size={16} />
                  {t.addToWallet}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TokensDirectory;
