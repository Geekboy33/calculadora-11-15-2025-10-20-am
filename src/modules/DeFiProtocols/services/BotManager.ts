// src/modules/DeFiProtocols/services/BotManager.ts

import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}




import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}



import { BotConfig, BotStatus, BotType, NetworkType, Trade, BotExecutionResult } from '../types';

export class BotManager {
  private bots: Map<string, BotConfig> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private botIntervals: Map<string, NodeJS.Timeout> = new Map();
  private botExecutors: Map<BotType, BotExecutor> = new Map();

  constructor() {
    this.initializeBotExecutors();
  }

  private initializeBotExecutors() {
    // Los ejecutores serán registrados por tipo de bot
    // Esto permite agregar nuevos tipos de bots sin modificar el manager
  }

  /**
   * Registrar un nuevo ejecutor de bot
   */
  registerBotExecutor(type: BotType, executor: BotExecutor) {
    this.botExecutors.set(type, executor);
    console.log(`✅ Bot executor registrado: ${type}`);
  }

  /**
   * Crear una nueva configuración de bot
   */
  createBot(config: Omit<BotConfig, 'createdAt' | 'updatedAt' | 'stats'>): BotConfig {
    const botConfig: BotConfig = {
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0
      }
    };

    this.bots.set(config.id, botConfig);
    this.trades.set(config.id, []);

    console.log(`✅ Bot creado: ${config.name} (${config.type})`);
    return botConfig;
  }

  /**
   * Obtener un bot por ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  /**
   * Listar todos los bots
   */
  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Actualizar configuración de un bot
   */
  updateBotConfig(botId: string, updates: Partial<BotConfig>): BotConfig | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const updated = {
      ...bot,
      ...updates,
      updatedAt: new Date(),
      id: bot.id,
      createdAt: bot.createdAt
    };

    this.bots.set(botId, updated);
    return updated;
  }

  /**
   * Activar un bot
   */
  async activateBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`❌ Bot no encontrado: ${botId}`);
      return false;
    }

    const executor = this.botExecutors.get(bot.type);
    if (!executor) {
      console.error(`❌ Executor no encontrado para tipo: ${bot.type}`);
      return false;
    }

    // Actualizar estado
    this.updateBotConfig(botId, { status: BotStatus.RUNNING, enabled: true });

    // Iniciar intervalo de ejecución
    const interval = setInterval(async () => {
      try {
        const result = await executor.execute(bot);
        if (result.trade) {
          this.recordTrade(botId, result.trade);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando bot ${botId}:`, error);
        this.updateBotConfig(botId, { status: BotStatus.ERROR });
      }
    }, bot.checkIntervalSeconds * 1000);

    this.botIntervals.set(botId, interval);
    console.log(`✅ Bot activado: ${bot.name}`);
    return true;
  }

  /**
   * Pausar un bot
   */
  pauseBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.PAUSED, enabled: false });
    console.log(`⏸️  Bot pausado: ${bot.name}`);
    return true;
  }

  /**
   * Detener un bot
   */
  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    const interval = this.botIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.botIntervals.delete(botId);
    }

    this.updateBotConfig(botId, { status: BotStatus.STOPPED, enabled: false });
    console.log(`⛔ Bot detenido: ${bot.name}`);
    return true;
  }

  /**
   * Registrar una operación comercial
   */
  private recordTrade(botId: string, trade: Trade) {
    const trades = this.trades.get(botId) || [];
    trades.push(trade);
    this.trades.set(botId, trades);

    // Actualizar estadísticas del bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stats.totalOperations++;
      bot.stats.lastTradedAt = new Date();

      if (trade.status === 'confirmed') {
        bot.stats.successfulOperations++;
        bot.stats.totalProfit += trade.profit;

        if (trade.profit > 0) {
          bot.stats.averageProfit =
            (bot.stats.averageProfit * (bot.stats.successfulOperations - 1) + trade.profit) /
            bot.stats.successfulOperations;
        }
      } else if (trade.status === 'failed') {
        bot.stats.failedOperations++;
        bot.stats.totalLoss += Math.abs(trade.profit);
      }

      bot.stats.winRate =
        (bot.stats.successfulOperations / bot.stats.totalOperations) * 100;

      this.updateBotConfig(botId, { stats: bot.stats });
    }
  }

  /**
   * Obtener todas las operaciones de un bot
   */
  getBotTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }

  /**
   * Obtener estadísticas de un bot
   */
  getBotStats(botId: string) {
    const bot = this.bots.get(botId);
    return bot?.stats || null;
  }

  /**
   * Obtener resumen general
   */
  getOverallStats() {
    const bots = Array.from(this.bots.values());
    const allTrades: Trade[] = [];

    bots.forEach(bot => {
      const trades = this.trades.get(bot.id) || [];
      allTrades.push(...trades);
    });

    const totalProfit = bots.reduce((sum, bot) => sum + bot.stats.totalProfit, 0);
    const totalOperations = bots.reduce((sum, bot) => sum + bot.stats.totalOperations, 0);
    const averageROI =
      bots.length > 0
        ? bots.reduce((sum, bot) => sum + (bot.stats.totalProfit / bot.capital), 0) /
          bots.length *
          100
        : 0;

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === BotStatus.RUNNING).length,
      totalProfit,
      totalOperations,
      averageROI,
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profit: b.stats.totalProfit,
        operations: b.stats.totalOperations
      }))
    };
  }

  /**
   * Exportar configuración de todos los bots
   */
  exportConfig(): string {
    const config = {
      bots: Array.from(this.bots.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importar configuración de bots
   */
  importConfig(configJson: string): number {
    try {
      const config = JSON.parse(configJson);
      let imported = 0;

      config.bots.forEach((botConfig: any) => {
        if (!this.bots.has(botConfig.id)) {
          this.bots.set(botConfig.id, botConfig);
          this.trades.set(botConfig.id, []);
          imported++;
        }
      });

      console.log(`✅ ${imported} bots importados`);
      return imported;
    } catch (error) {
      console.error('❌ Error importando configuración:', error);
      return 0;
    }
  }
}

/**
 * Interfaz para ejecutores de bots
 */
export interface BotExecutor {
  execute(config: BotConfig): Promise<BotExecutionResult>;
  validate(config: BotConfig): boolean;
}





