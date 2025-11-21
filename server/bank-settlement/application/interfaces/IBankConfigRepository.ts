/**
 * Bank Config Repository Interface
 */

import { BankDestinationConfig } from '../../domain/entities/BankDestinationConfig';

export interface IBankConfigRepository {
  /**
   * Buscar configuración por código de banco
   */
  findByBankCode(bankCode: string): Promise<BankDestinationConfig | null>;

  /**
   * Listar todas las configuraciones activas
   */
  findAllActive(): Promise<BankDestinationConfig[]>;

  /**
   * Guardar o actualizar configuración
   */
  save(config: BankDestinationConfig): Promise<void>;
}

