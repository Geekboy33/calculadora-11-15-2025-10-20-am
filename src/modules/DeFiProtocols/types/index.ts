// src/modules/DeFiProtocols/types/index.ts

export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}




export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}



export enum BotType {
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  YIELD_FARMING = 'yield_farming',
  FLASH_LOAN = 'flash_loan',
  FLASH_ARBITRAGE = 'flash_arbitrage',
  DEX_AGGREGATOR = 'dex_aggregator',
  LENDING = 'lending',
  DERIVATIVE = 'derivative'
}

export enum NetworkType {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base'
}

export enum BotStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export interface BotConfig {
  id: string;
  name: string;
  type: BotType;
  network: NetworkType;
  enabled: boolean;
  status: BotStatus;
  
  // Configuración de capital
  capital: number; // En USD
  maxCapitalPerTrade: number;
  minProfitThreshold: number; // % mínimo de ganancia
  
  // Configuración de parámetros específicos del bot
  parameters: Record<string, any>;
  
  // Configuración de seguridad
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  
  // Configuración de ejecución
  checkIntervalSeconds: number;
  maxGasPrice: number; // En Gwei
  slippageTolerance: number; // En %
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  
  // Estadísticas
  stats: BotStats;
}

export interface BotStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  lastTradedAt?: Date;
}

export interface Trade {
  id: string;
  botId: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'swap';
  
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  
  profit: number;
  roi: number;
  gasUsed: number;
  gasCost: number;
  
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface DeFiProtocol {
  name: string;
  type: 'dex' | 'lending' | 'yield' | 'other';
  network: NetworkType;
  address: string;
  abi: any[];
}

export interface BotExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  gasUsed?: number;
  profit?: number;
}





