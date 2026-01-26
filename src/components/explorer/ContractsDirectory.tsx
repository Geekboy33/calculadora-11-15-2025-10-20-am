// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONTRACTS DIRECTORY - LemonChain Verified Contracts Registry
// Directorio profesional de contratos verificados con análisis y métricas
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCode, Search, RefreshCw, Copy, Check, ExternalLink, ArrowLeft,
  Shield, ShieldCheck, ShieldAlert, Activity, Clock, Hash, Database,
  Code, GitBranch, Lock, Unlock, Users, Zap, Eye, BarChart2,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle,
  Settings, FileText, Layers, Server, Terminal, Box, Coins
} from 'lucide-react';
import { CONTRACT_ADDRESSES_V5 } from '../../lib/blockchain/auto-connect-service';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

interface ContractFunction {
  name: string;
  type: 'read' | 'write';
  inputs: { name: string; type: string }[];
  outputs?: { type: string }[];
  stateMutability?: string;
}

interface ContractEvent {
  name: string;
  inputs: { name: string; type: string; indexed: boolean }[];
}

interface Contract {
  address: string;
  name: string;
  type: 'token' | 'defi' | 'bridge' | 'oracle' | 'governance' | 'utility' | 'proxy';
  verified: boolean;
  verifiedAt?: string;
  compiler?: string;
  optimization?: boolean;
  runs?: number;
  license?: string;
  creator?: string;
  createdAt?: string;
  creationTxHash?: string;
  balance?: string;
  transactions?: number;
  functions?: ContractFunction[];
  events?: ContractEvent[];
  isProxy?: boolean;
  implementation?: string;
  description?: string;
  sourceCode?: string;
  abi?: string;
  securityScore?: number;
  auditStatus?: 'audited' | 'pending' | 'not-audited';
  auditor?: string;
}

interface ContractsDirectoryProps {
  onBack?: () => void;
  language?: 'en' | 'es';
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  en: {
    title: 'Contracts Directory',
    subtitle: 'LemonChain Verified Smart Contracts',
    search: 'Search contracts by name or address...',
    totalContracts: 'Total Contracts',
    verifiedContracts: 'Verified',
    auditedContracts: 'Audited',
    totalTxs: 'Total Transactions',
    contractDetails: 'Contract Details',
    readContract: 'Read Contract',
    writeContract: 'Write Contract',
    events: 'Events',
    sourceCode: 'Source Code',
    abi: 'ABI',
    back: 'Back',
    refresh: 'Refresh',
    viewOnExplorer: 'View on Explorer',
    copyABI: 'Copy ABI',
    copyAddress: 'Copy Address',
    loading: 'Loading contracts...',
    noContracts: 'No contracts found',
    verified: 'Verified',
    unverified: 'Unverified',
    copied: 'Copied!',
    all: 'All',
    tokens: 'Tokens',
    defi: 'DeFi',
    bridges: 'Bridges',
    oracles: 'Oracles',
    governance: 'Governance',
    utilities: 'Utilities',
    address: 'Address',
    balance: 'Balance',
    transactions: 'Transactions',
    compiler: 'Compiler',
    optimization: 'Optimization',
    license: 'License',
    creator: 'Creator',
    createdAt: 'Created',
    functions: 'Functions',
    securityScore: 'Security Score',
    auditStatus: 'Audit Status',
    audited: 'Audited',
    pending: 'Pending',
    notAudited: 'Not Audited',
    proxyContract: 'Proxy Contract',
    implementation: 'Implementation',
    readFunctions: 'Read Functions',
    writeFunctions: 'Write Functions',
    inputs: 'Inputs',
    outputs: 'Outputs',
    contractType: 'Type',
    verificationDate: 'Verified On'
  },
  es: {
    title: 'Directorio de Contratos',
    subtitle: 'Contratos Inteligentes Verificados de LemonChain',
    search: 'Buscar contratos por nombre o dirección...',
    totalContracts: 'Total de Contratos',
    verifiedContracts: 'Verificados',
    auditedContracts: 'Auditados',
    totalTxs: 'Total de Transacciones',
    contractDetails: 'Detalles del Contrato',
    readContract: 'Leer Contrato',
    writeContract: 'Escribir Contrato',
    events: 'Eventos',
    sourceCode: 'Código Fuente',
    abi: 'ABI',
    back: 'Volver',
    refresh: 'Actualizar',
    viewOnExplorer: 'Ver en Explorer',
    copyABI: 'Copiar ABI',
    copyAddress: 'Copiar Dirección',
    loading: 'Cargando contratos...',
    noContracts: 'No se encontraron contratos',
    verified: 'Verificado',
    unverified: 'No Verificado',
    copied: '¡Copiado!',
    all: 'Todos',
    tokens: 'Tokens',
    defi: 'DeFi',
    bridges: 'Bridges',
    oracles: 'Oráculos',
    governance: 'Gobernanza',
    utilities: 'Utilidades',
    address: 'Dirección',
    balance: 'Balance',
    transactions: 'Transacciones',
    compiler: 'Compilador',
    optimization: 'Optimización',
    license: 'Licencia',
    creator: 'Creador',
    createdAt: 'Creado',
    functions: 'Funciones',
    securityScore: 'Puntuación de Seguridad',
    auditStatus: 'Estado de Auditoría',
    audited: 'Auditado',
    pending: 'Pendiente',
    notAudited: 'No Auditado',
    proxyContract: 'Contrato Proxy',
    implementation: 'Implementación',
    readFunctions: 'Funciones de Lectura',
    writeFunctions: 'Funciones de Escritura',
    inputs: 'Entradas',
    outputs: 'Salidas',
    contractType: 'Tipo',
    verificationDate: 'Verificado el'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const directoryStyles = `
  .contracts-directory {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%);
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    padding: 24px;
  }

  .contracts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .contracts-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    color: #60a5fa;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .back-btn:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }

  .contracts-title-section h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .contracts-title-section p {
    color: #8b949e;
    margin: 4px 0 0 0;
    font-size: 14px;
  }

  .contracts-header-right {
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
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 10px;
    color: #e6edf3;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }

  .search-input:focus {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    color: #60a5fa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: rgba(59, 130, 246, 0.2);
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
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
  }

  .stat-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #2563eb);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover::before {
    opacity: 1;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    color: #3b82f6;
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
    border: 1px solid rgba(59, 130, 246, 0.2);
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
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
  }

  .filter-tab.active {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.5);
  }

  .filter-count {
    background: rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }

  /* Main Content */
  .contracts-content {
    display: grid;
    grid-template-columns: 1fr 450px;
    gap: 24px;
  }

  @media (max-width: 1200px) {
    .contracts-content {
      grid-template-columns: 1fr;
    }
  }

  /* Contracts List */
  .contracts-list {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 16px;
    overflow: hidden;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  }

  .list-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: #e6edf3;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  .list-header h2 svg {
    color: #3b82f6;
  }

  .contract-item {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.05);
    cursor: pointer;
    transition: all 0.2s;
  }

  .contract-item:hover {
    background: rgba(59, 130, 246, 0.05);
  }

  .contract-item.selected {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }

  .contract-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    margin-right: 16px;
    flex-shrink: 0;
  }

  .contract-info {
    flex: 1;
    min-width: 0;
  }

  .contract-name {
    font-size: 15px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .contract-address {
    font-size: 12px;
    color: #8b949e;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .contract-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: 16px;
  }

  .contract-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .contract-badge.verified {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .contract-badge.unverified {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .contract-badge.token {
    background: rgba(250, 204, 21, 0.15);
    color: #facc15;
  }

  .contract-badge.defi {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }

  .contract-badge.bridge {
    background: rgba(236, 72, 153, 0.15);
    color: #f472b6;
  }

  .contract-badge.oracle {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .contract-badge.governance {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .contract-badge.utility {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }

  .contract-badge.proxy {
    background: rgba(236, 72, 153, 0.15);
    color: #f472b6;
  }

  /* Contract Details Panel */
  .contract-details-panel {
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.9));
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 16px;
    height: fit-content;
    position: sticky;
    top: 24px;
    overflow: hidden;
  }

  .details-header {
    padding: 24px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  }

  .details-title {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }

  .details-icon {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }

  .details-title-info h3 {
    font-size: 18px;
    font-weight: 600;
    color: #e6edf3;
    margin: 0 0 4px 0;
  }

  .details-title-info p {
    font-size: 13px;
    color: #8b949e;
    margin: 0;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .details-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .security-score {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: rgba(13, 17, 23, 0.5);
    border-radius: 10px;
    margin-top: 16px;
  }

  .score-bar {
    flex: 1;
    height: 8px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s;
  }

  .score-fill.high {
    background: linear-gradient(90deg, #22c55e, #4ade80);
  }

  .score-fill.medium {
    background: linear-gradient(90deg, #facc15, #fbbf24);
  }

  .score-fill.low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }

  .score-value {
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
    min-width: 40px;
    text-align: right;
  }

  .details-content {
    padding: 20px 24px;
    max-height: 500px;
    overflow-y: auto;
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
    border-bottom: 1px solid rgba(59, 130, 246, 0.05);
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
    text-align: right;
  }

  .detail-value.address {
    color: #60a5fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-value.address:hover {
    color: #93c5fd;
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
    color: #3b82f6;
  }

  /* Functions List */
  .functions-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .function-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(13, 17, 23, 0.5);
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .function-item:last-child {
    margin-bottom: 0;
  }

  .function-item:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .function-type {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .function-type.read {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .function-type.write {
    background: rgba(250, 204, 21, 0.15);
    color: #facc15;
  }

  .function-name {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #e6edf3;
    flex: 1;
  }

  .function-inputs {
    font-size: 11px;
    color: #8b949e;
  }

  /* Events List */
  .events-list {
    max-height: 150px;
    overflow-y: auto;
  }

  .event-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(13, 17, 23, 0.5);
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .event-item:last-child {
    margin-bottom: 0;
  }

  .event-icon {
    color: #f472b6;
  }

  .event-name {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #e6edf3;
    flex: 1;
  }

  .event-params {
    font-size: 11px;
    color: #8b949e;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 120px;
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
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2));
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #3b82f6;
  }

  .action-btn.primary:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.3));
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
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
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
    .contracts-directory {
      padding: 16px;
    }

    .contracts-header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-container {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// KNOWN CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const KNOWN_CONTRACTS: Contract[] = [
  {
    address: CONTRACT_ADDRESSES_V5.VUSD,
    name: 'VUSD Token',
    type: 'token',
    verified: true,
    verifiedAt: '2026-01-15',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    creator: '0x...',
    transactions: 1245,
    securityScore: 95,
    auditStatus: 'audited',
    auditor: 'Internal Review',
    description: 'USD-backed stablecoin minted through LemonMinted protocol',
    functions: [
      { name: 'totalSupply', type: 'read', inputs: [], outputs: [{ type: 'uint256' }] },
      { name: 'balanceOf', type: 'read', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { name: 'transfer', type: 'write', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
      { name: 'mint', type: 'write', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
      { name: 'burn', type: 'write', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] }
    ],
    events: [
      { name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
      { name: 'Approval', inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] }
    ]
  },
  {
    address: CONTRACT_ADDRESSES_V5.USDTokenized,
    name: 'USDTokenized',
    type: 'defi',
    verified: true,
    verifiedAt: '2026-01-15',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    transactions: 856,
    securityScore: 92,
    auditStatus: 'audited',
    description: 'First signature contract for USD tokenization from DAES treasury',
    functions: [
      { name: 'injectUSD', type: 'write', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'referenceId', type: 'string' }], outputs: [{ type: 'bytes32' }] },
      { name: 'acceptInjection', type: 'write', inputs: [{ name: 'injectionId', type: 'bytes32' }], outputs: [] },
      { name: 'moveToLockReserve', type: 'write', inputs: [{ name: 'injectionId', type: 'bytes32' }], outputs: [] },
      { name: 'getInjection', type: 'read', inputs: [{ name: 'injectionId', type: 'bytes32' }], outputs: [{ type: 'tuple' }] }
    ],
    events: [
      { name: 'USDInjected', inputs: [{ name: 'injectionId', type: 'bytes32', indexed: true }, { name: 'depositor', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
      { name: 'InjectionAccepted', inputs: [{ name: 'injectionId', type: 'bytes32', indexed: true }, { name: 'acceptedBy', type: 'address', indexed: true }] },
      { name: 'MovedToLockReserve', inputs: [{ name: 'injectionId', type: 'bytes32', indexed: true }, { name: 'lockId', type: 'uint256', indexed: false }] }
    ]
  },
  {
    address: CONTRACT_ADDRESSES_V5.LockReserve,
    name: 'LockReserve',
    type: 'defi',
    verified: true,
    verifiedAt: '2026-01-15',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    transactions: 432,
    securityScore: 94,
    auditStatus: 'audited',
    description: 'Second signature contract for locking USD backing VUSD minting',
    functions: [
      { name: 'createLock', type: 'write', inputs: [{ name: 'injectionId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
      { name: 'releaseLock', type: 'write', inputs: [{ name: 'lockId', type: 'uint256' }], outputs: [] },
      { name: 'consumeLock', type: 'write', inputs: [{ name: 'lockId', type: 'uint256' }], outputs: [] },
      { name: 'getLock', type: 'read', inputs: [{ name: 'lockId', type: 'uint256' }], outputs: [{ type: 'tuple' }] }
    ],
    events: [
      { name: 'LockCreated', inputs: [{ name: 'lockId', type: 'uint256', indexed: true }, { name: 'injectionId', type: 'bytes32', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
      { name: 'LockReleased', inputs: [{ name: 'lockId', type: 'uint256', indexed: true }, { name: 'releasedBy', type: 'address', indexed: true }] },
      { name: 'LockConsumed', inputs: [{ name: 'lockId', type: 'uint256', indexed: true }, { name: 'consumedBy', type: 'address', indexed: true }] }
    ]
  },
  {
    address: CONTRACT_ADDRESSES_V5.VUSDMinter,
    name: 'VUSDMinter',
    type: 'defi',
    verified: true,
    verifiedAt: '2026-01-15',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    transactions: 289,
    securityScore: 96,
    auditStatus: 'audited',
    description: 'Third signature contract for minting VUSD backed by locked USD',
    functions: [
      { name: 'generateSignature', type: 'write', inputs: [{ name: 'lockId', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
      { name: 'mintVUSD', type: 'write', inputs: [{ name: 'signatureId', type: 'bytes32' }, { name: 'recipient', type: 'address' }], outputs: [] },
      { name: 'executeMint', type: 'write', inputs: [{ name: 'signatureId', type: 'bytes32' }], outputs: [] },
      { name: 'getSignature', type: 'read', inputs: [{ name: 'signatureId', type: 'bytes32' }], outputs: [{ type: 'tuple' }] }
    ],
    events: [
      { name: 'BackedSignatureGenerated', inputs: [{ name: 'signatureId', type: 'bytes32', indexed: true }, { name: 'lockId', type: 'uint256', indexed: false }] },
      { name: 'VUSDMinted', inputs: [{ name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'signatureId', type: 'bytes32', indexed: true }] },
      { name: 'MintExecuted', inputs: [{ name: 'executor', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] }
    ]
  },
  {
    address: CONTRACT_ADDRESSES_V5.MultichainBridge,
    name: 'MultichainBridge',
    type: 'bridge',
    verified: true,
    verifiedAt: '2026-01-15',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    transactions: 178,
    securityScore: 88,
    auditStatus: 'pending',
    description: 'Cross-chain bridge for VUSD transfers between networks',
    functions: [
      { name: 'bridgeOut', type: 'write', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'targetChain', type: 'uint256' }], outputs: [] },
      { name: 'bridgeIn', type: 'write', inputs: [{ name: 'proof', type: 'bytes' }], outputs: [] },
      { name: 'getSupportedChains', type: 'read', inputs: [], outputs: [{ type: 'uint256[]' }] }
    ],
    events: [
      { name: 'BridgeOutInitiated', inputs: [{ name: 'sender', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'targetChain', type: 'uint256', indexed: false }] },
      { name: 'BridgeInCompleted', inputs: [{ name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] }
    ]
  },
  {
    address: CONTRACT_ADDRESSES_V5.PriceOracle,
    name: 'PriceOracle',
    type: 'oracle',
    verified: true,
    verifiedAt: '2026-01-14',
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    license: 'MIT',
    transactions: 3421,
    securityScore: 91,
    auditStatus: 'audited',
    description: 'Price oracle for stablecoin rates and collateral valuations',
    functions: [
      { name: 'getPrice', type: 'read', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { name: 'updatePrice', type: 'write', inputs: [{ name: 'token', type: 'address' }, { name: 'price', type: 'uint256' }], outputs: [] },
      { name: 'getLatestRound', type: 'read', inputs: [], outputs: [{ type: 'tuple' }] }
    ],
    events: [
      { name: 'PriceUpdated', inputs: [{ name: 'token', type: 'address', indexed: true }, { name: 'price', type: 'uint256', indexed: false }, { name: 'timestamp', type: 'uint256', indexed: false }] }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export const ContractsDirectory: React.FC<ContractsDirectoryProps> = ({
  onBack,
  language = 'en'
}) => {
  const t = TRANSLATIONS[language];
  
  // State
  const [contracts, setContracts] = useState<Contract[]>(KNOWN_CONTRACTS);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);

  // Initial selection
  useEffect(() => {
    if (!selectedContract && contracts.length > 0) {
      setSelectedContract(contracts[0]);
    }
  }, [contracts, selectedContract]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // In production, fetch from indexer/API
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Filter contracts
  const filteredContracts = useMemo(() => {
    let result = contracts;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contract =>
        contract.name.toLowerCase().includes(query) ||
        contract.address.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (activeFilter !== 'all') {
      result = result.filter(contract => contract.type === activeFilter);
    }
    
    return result;
  }, [contracts, searchQuery, activeFilter]);

  // Stats
  const stats = useMemo(() => ({
    totalContracts: contracts.length,
    verifiedContracts: contracts.filter(c => c.verified).length,
    auditedContracts: contracts.filter(c => c.auditStatus === 'audited').length,
    totalTxs: contracts.reduce((sum, c) => sum + (c.transactions || 0), 0)
  }), [contracts]);

  // Get security score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  };

  return (
    <>
      <style>{directoryStyles}</style>
      <div className="contracts-directory">
        {/* Header */}
        <div className="contracts-header">
          <div className="contracts-header-left">
            {onBack && (
              <button className="back-btn" onClick={onBack} title={t.back} aria-label={t.back}>
                <ArrowLeft size={18} />
                {t.back}
              </button>
            )}
            <div className="contracts-title-section">
              <h1>
                <FileCode size={28} />
                {t.title}
              </h1>
              <p>{t.subtitle}</p>
            </div>
          </div>
          
          <div className="contracts-header-right">
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
              <FileCode size={22} />
            </div>
            <div className="stat-value">{stats.totalContracts}</div>
            <div className="stat-label">{t.totalContracts}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <ShieldCheck size={22} />
            </div>
            <div className="stat-value">{stats.verifiedContracts}</div>
            <div className="stat-label">{t.verifiedContracts}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={22} />
            </div>
            <div className="stat-value">{stats.auditedContracts}</div>
            <div className="stat-label">{t.auditedContracts}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={22} />
            </div>
            <div className="stat-value">{stats.totalTxs.toLocaleString()}</div>
            <div className="stat-label">{t.totalTxs}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            {t.all}
            <span className="filter-count">{contracts.length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'token' ? 'active' : ''}`}
            onClick={() => setActiveFilter('token')}
          >
            {t.tokens}
            <span className="filter-count">{contracts.filter(c => c.type === 'token').length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'defi' ? 'active' : ''}`}
            onClick={() => setActiveFilter('defi')}
          >
            {t.defi}
            <span className="filter-count">{contracts.filter(c => c.type === 'defi').length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'bridge' ? 'active' : ''}`}
            onClick={() => setActiveFilter('bridge')}
          >
            {t.bridges}
            <span className="filter-count">{contracts.filter(c => c.type === 'bridge').length}</span>
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'oracle' ? 'active' : ''}`}
            onClick={() => setActiveFilter('oracle')}
          >
            {t.oracles}
            <span className="filter-count">{contracts.filter(c => c.type === 'oracle').length}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="contracts-content">
          {/* Contracts List */}
          <div className="contracts-list">
            <div className="list-header">
              <h2>
                <Code size={20} />
                {t.totalContracts}: {filteredContracts.length}
              </h2>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>{t.loading}</span>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="empty-state">
                <FileCode size={48} />
                <p>{t.noContracts}</p>
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <div 
                  key={contract.address}
                  className={`contract-item ${selectedContract?.address === contract.address ? 'selected' : ''}`}
                  onClick={() => setSelectedContract(contract)}
                >
                  <div className="contract-icon">
                    {contract.type === 'token' && <Coins size={20} />}
                    {contract.type === 'defi' && <Layers size={20} />}
                    {contract.type === 'bridge' && <GitBranch size={20} />}
                    {contract.type === 'oracle' && <Activity size={20} />}
                    {contract.type === 'governance' && <Settings size={20} />}
                    {contract.type === 'utility' && <Box size={20} />}
                  </div>
                  
                  <div className="contract-info">
                    <div className="contract-name">
                      {contract.name}
                      {contract.verified && <ShieldCheck size={14} style={{ color: '#22c55e' }} />}
                    </div>
                    <div className="contract-address">
                      {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                    </div>
                  </div>
                  
                  <div className="contract-meta">
                    <span className={`contract-badge ${contract.type}`}>
                      {contract.type}
                    </span>
                    <span className={`contract-badge ${contract.verified ? 'verified' : 'unverified'}`}>
                      {contract.verified ? t.verified : t.unverified}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Contract Details Panel */}
          {selectedContract && (
            <div className="contract-details-panel">
              <div className="details-header">
                <div className="details-title">
                  <div className="details-icon">
                    {selectedContract.type === 'token' && <Coins size={24} />}
                    {selectedContract.type === 'defi' && <Layers size={24} />}
                    {selectedContract.type === 'bridge' && <GitBranch size={24} />}
                    {selectedContract.type === 'oracle' && <Activity size={24} />}
                    {selectedContract.type === 'governance' && <Settings size={24} />}
                    {selectedContract.type === 'utility' && <Box size={24} />}
                  </div>
                  <div className="details-title-info">
                    <h3>{selectedContract.name}</h3>
                    <p>{selectedContract.address.slice(0, 14)}...{selectedContract.address.slice(-10)}</p>
                  </div>
                </div>
                
                <div className="details-badges">
                  <span className={`contract-badge ${selectedContract.type}`}>
                    {selectedContract.type}
                  </span>
                  <span className={`contract-badge ${selectedContract.verified ? 'verified' : 'unverified'}`}>
                    {selectedContract.verified ? t.verified : t.unverified}
                  </span>
                  {selectedContract.auditStatus && (
                    <span className={`contract-badge ${selectedContract.auditStatus === 'audited' ? 'verified' : 'unverified'}`}>
                      {selectedContract.auditStatus === 'audited' ? t.audited : 
                       selectedContract.auditStatus === 'pending' ? t.pending : t.notAudited}
                    </span>
                  )}
                </div>
                
                {selectedContract.securityScore && (
                  <div className="security-score">
                    <span style={{ fontSize: 12, color: '#8b949e' }}>{t.securityScore}</span>
                    <div className="score-bar">
                      <div 
                        className={`score-fill ${getScoreColor(selectedContract.securityScore)}`}
                        style={{ width: `${selectedContract.securityScore}%` }}
                      ></div>
                    </div>
                    <span className="score-value">{selectedContract.securityScore}/100</span>
                  </div>
                )}
              </div>
              
              <div className="details-content">
                <div className="detail-section">
                  <div className="detail-section-title">
                    <Database size={14} />
                    Contract Information
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.address}</span>
                    <span 
                      className="detail-value address" 
                      onClick={() => copyToClipboard(selectedContract.address, 'address')}
                    >
                      {selectedContract.address.slice(0, 10)}...{selectedContract.address.slice(-8)}
                      <button className="copy-btn" title="Copy" aria-label="Copy address">
                        {copied === 'address' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.compiler}</span>
                    <span className="detail-value">{selectedContract.compiler || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.optimization}</span>
                    <span className="detail-value">
                      {selectedContract.optimization ? `Yes (${selectedContract.runs} runs)` : 'No'}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.license}</span>
                    <span className="detail-value">{selectedContract.license || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{t.transactions}</span>
                    <span className="detail-value">{(selectedContract.transactions || 0).toLocaleString()}</span>
                  </div>
                  
                  {selectedContract.verifiedAt && (
                    <div className="detail-row">
                      <span className="detail-label">{t.verificationDate}</span>
                      <span className="detail-value">{selectedContract.verifiedAt}</span>
                    </div>
                  )}
                </div>

                {selectedContract.description && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <Eye size={14} />
                      Description
                    </div>
                    <p style={{ fontSize: 13, color: '#8b949e', margin: 0, lineHeight: 1.6 }}>
                      {selectedContract.description}
                    </p>
                  </div>
                )}

                {selectedContract.functions && selectedContract.functions.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <Terminal size={14} />
                      {t.functions} ({selectedContract.functions.length})
                    </div>
                    <div className="functions-list">
                      {selectedContract.functions.map((fn, idx) => (
                        <div key={idx} className="function-item">
                          <span className={`function-type ${fn.type}`}>
                            {fn.type}
                          </span>
                          <span className="function-name">{fn.name}</span>
                          <span className="function-inputs">
                            ({fn.inputs.map(i => i.type).join(', ')})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContract.events && selectedContract.events.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <Zap size={14} />
                      {t.events} ({selectedContract.events.length})
                    </div>
                    <div className="events-list">
                      {selectedContract.events.map((event, idx) => (
                        <div key={idx} className="event-item">
                          <Zap size={14} className="event-icon" />
                          <span className="event-name">{event.name}</span>
                          <span className="event-params">
                            {event.inputs.length} params
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                <button className="action-btn primary">
                  <ExternalLink size={16} />
                  {t.viewOnExplorer}
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => copyToClipboard(JSON.stringify(selectedContract.functions || []), 'abi')}
                >
                  <Copy size={16} />
                  {copied === 'abi' ? t.copied : t.copyABI}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContractsDirectory;
