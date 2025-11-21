/**
 * Use Case: Get Bank Settlement By ID
 */

import { ISettlementRepository } from '../interfaces/ISettlementRepository';
import { SettlementNotFoundError } from '../../domain/errors/DomainError';

export class GetBankSettlementById {
  constructor(private readonly settlementRepo: ISettlementRepository) {}

  async execute(settlementId: string): Promise<Record<string, any>> {
    const instruction = await this.settlementRepo.findById(settlementId);

    if (!instruction) {
      throw new SettlementNotFoundError(settlementId);
    }

    // Incluir bankName en la respuesta
    return {
      ...instruction.toJSON(),
      bankName: instruction.getBankCode() === 'ENBD' ? 'EMIRATES NBD' : instruction.getBankCode()
    };
  }
}

