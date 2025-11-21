/**
 * In-Memory Settlement Repository
 * Para desarrollo y testing (reemplazar con PostgreSQL en producción)
 */

import { BankSettlementInstruction } from '../../../domain/entities/BankSettlementInstruction';
import { ISettlementRepository } from '../../../application/interfaces/ISettlementRepository';

export class InMemorySettlementRepository implements ISettlementRepository {
  private settlements: Map<string, BankSettlementInstruction> = new Map();

  async save(instruction: BankSettlementInstruction): Promise<void> {
    this.settlements.set(instruction.getId(), instruction);
    console.log('[InMemorySettlementRepo] Settlement saved:', instruction.getDaesReferenceId());
  }

  async update(instruction: BankSettlementInstruction): Promise<void> {
    if (!this.settlements.has(instruction.getId())) {
      throw new Error(`Settlement not found: ${instruction.getId()}`);
    }
    this.settlements.set(instruction.getId(), instruction);
    console.log('[InMemorySettlementRepo] Settlement updated:', instruction.getDaesReferenceId());
  }

  async findById(id: string): Promise<BankSettlementInstruction | null> {
    return this.settlements.get(id) || null;
  }

  async findByDaesReferenceId(daesReferenceId: string): Promise<BankSettlementInstruction | null> {
    for (const instruction of this.settlements.values()) {
      if (instruction.getDaesReferenceId() === daesReferenceId) {
        return instruction;
      }
    }
    return null;
  }

  async findByStatus(status: string): Promise<BankSettlementInstruction[]> {
    const results: BankSettlementInstruction[] = [];
    for (const instruction of this.settlements.values()) {
      if (instruction.getStatus().getCode() === status) {
        results.push(instruction);
      }
    }
    return results;
  }

  async findByExecutionDate(startDate: Date, endDate: Date): Promise<BankSettlementInstruction[]> {
    const results: BankSettlementInstruction[] = [];
    for (const instruction of this.settlements.values()) {
      const executedAt = instruction.getExecutedAt();
      if (executedAt && executedAt >= startDate && executedAt <= endDate) {
        results.push(instruction);
      }
    }
    return results.sort((a, b) => 
      (a.getExecutedAt()?.getTime() || 0) - (b.getExecutedAt()?.getTime() || 0)
    );
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<BankSettlementInstruction[]> {
    const all = Array.from(this.settlements.values());
    return all
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime())
      .slice(offset, offset + limit);
  }

  // Helper para testing
  clear(): void {
    this.settlements.clear();
  }

  count(): number {
    return this.settlements.size;
  }
}

