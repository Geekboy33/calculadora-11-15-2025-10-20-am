// src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts

import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}



import { ethers } from 'ethers';
import { BotConfig, BotExecutionResult, Trade, BotStatus } from '../types';
import { BotExecutor } from '../services/BotManager';

export class ArbitrageExecutor implements BotExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  validate(config: BotConfig): boolean {
    // Validar que tiene los parámetros requeridos
    const requiredParams = ['pairs', 'maxSlippage', 'minProfit'];
    for (const param of requiredParams) {
      if (!(param in config.parameters)) {
        console.error(`❌ Parámetro requerido faltante: ${param}`);
        return false;
      }
    }

    // Validar configuración de capital
    if (config.capital <= 0 || config.maxCapitalPerTrade <= 0) {
      console.error('❌ Capital debe ser mayor a 0');
      return false;
    }

    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      if (!this.validate(config)) {
        return {
          success: false,
          error: 'Configuración del bot inválida'
        };
      }

      const { pairs, minProfit } = config.parameters;

      // Buscar oportunidad de arbitrage
      for (const pair of pairs) {
        const opportunity = await this.findArbitrageOpportunity(
          pair,
          config.maxCapitalPerTrade,
          minProfit
        );

        if (opportunity) {
          // Ejecutar arbitrage
          const trade = await this.executeArbitrage(config, opportunity);
          
          if (trade) {
            return {
              success: true,
              trade
            };
          }
        }
      }

      return {
        success: false,
        error: 'No se encontraron oportunidades de arbitrage'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async findArbitrageOpportunity(
    pair: { tokenIn: string; tokenOut: string; dex1: string; dex2: string },
    capital: number,
    minProfit: number
  ) {
    try {
      // Obtener precios de ambos DEX
      const price1 = await this.getPrice(pair.tokenIn, pair.tokenOut, pair.dex1, capital);
      const price2 = await this.getPrice(pair.tokenOut, pair.tokenIn, pair.dex2, capital);

      const profitMargin = Math.abs((price2 - price1) / price1) * 100;

      if (profitMargin >= minProfit) {
        return {
          ...pair,
          price1,
          price2,
          profitMargin,
          amountIn: capital
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando oportunidad:', error);
      return null;
    }
  }

  private async getPrice(
    tokenIn: string,
    tokenOut: string,
    dex: string,
    amount: number
  ): Promise<number> {
    // Aquí iría la lógica para obtener precios de cada DEX
    // Por ahora retornamos valores simulados
    return 1.0 + Math.random() * 0.01;
  }

  private async executeArbitrage(config: BotConfig, opportunity: any): Promise<Trade | null> {
    const tradeId = `${config.id}-${Date.now()}`;

    try {
      // Simular ejecución de arbitrage
      const gasEstimate = 250000;
      const feeData = await this.provider.getFeeData();
      const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);
      const gasCost = parseFloat(ethers.formatEther(BigInt(gasEstimate) * gasPrice)) * 2500;

      const profit = opportunity.profitMargin * opportunity.amountIn / 100 - gasCost;
      const roi = (profit / opportunity.amountIn) * 100;

      const trade: Trade = {
        id: tradeId,
        botId: config.id,
        timestamp: new Date(),
        type: 'swap',
        tokenIn: opportunity.tokenIn,
        tokenOut: opportunity.tokenOut,
        amountIn: opportunity.amountIn,
        amountOut: opportunity.amountIn * opportunity.price2 / opportunity.price1,
        profit,
        roi,
        gasUsed: gasEstimate,
        gasCost,
        txHash: `0x${Math.random().toString(16).slice(2)}`, // Simulado
        status: 'confirmed'
      };

      console.log(`✅ Arbitrage ejecutado: ${config.name} - Ganancia: $${profit.toFixed(2)}`);
      return trade;

    } catch (error: any) {
      console.error(`❌ Error ejecutando arbitrage: ${error.message}`);
      return null;
    }
  }
}




