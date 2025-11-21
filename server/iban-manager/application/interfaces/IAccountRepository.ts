/**
 * Account Repository Interface (DAES Accounts)
 */

export interface DaesAccount {
  id: string;
  ownerId: string;
  accountType: string;
  currency: string;
  balance: number;
  status: string;
  createdAt: Date;
}

export interface IAccountRepository {
  findById(id: string): Promise<DaesAccount | null>;
  findByOwnerId(ownerId: string): Promise<DaesAccount[]>;
}

