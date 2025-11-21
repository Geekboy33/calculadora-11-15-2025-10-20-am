/**
 * In-Memory Bank Config Repository
 * Para desarrollo y testing
 */

import { BankDestinationConfig } from '../../../domain/entities/BankDestinationConfig';
import { IBankConfigRepository } from '../../../application/interfaces/IBankConfigRepository';
import { BANK_DESTINATIONS } from '../../config/bank-destinations';

export class InMemoryBankConfigRepository implements IBankConfigRepository {
  private configs: Map<string, BankDestinationConfig> = new Map();

  constructor() {
    // Inicializar con ENBD por defecto
    const enbdConfig = BankDestinationConfig.create(BANK_DESTINATIONS.ENBD);
    this.configs.set(enbdConfig.getBankCode(), enbdConfig);
  }

  async findByBankCode(bankCode: string): Promise<BankDestinationConfig | null> {
    return this.configs.get(bankCode) || null;
  }

  async findAllActive(): Promise<BankDestinationConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.isActive());
  }

  async save(config: BankDestinationConfig): Promise<void> {
    this.configs.set(config.getBankCode(), config);
    console.log('[InMemoryBankConfigRepo] Config saved:', config.getBankCode());
  }

  // Helper para testing
  clear(): void {
    this.configs.clear();
  }

  count(): number {
    return this.configs.size;
  }
}

