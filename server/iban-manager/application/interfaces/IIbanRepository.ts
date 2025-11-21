/**
 * IBAN Repository Interface
 */

import { IBAN } from '../../domain/entities/IBAN';

export interface IIbanRepository {
  save(iban: IBAN): Promise<void>;
  update(iban: IBAN): Promise<void>;
  findById(id: string): Promise<IBAN | null>;
  findByIban(iban: string): Promise<IBAN | null>;
  findByDaesAccountId(daesAccountId: string): Promise<IBAN[]>;
  findByStatus(status: string): Promise<IBAN[]>;
  existsByIban(iban: string): Promise<boolean>;
  findAll(limit?: number, offset?: number): Promise<IBAN[]>;
}

