/**
 * All Repositories - Digital Commercial Bank Ltd / DAES Partner API
 * Consolidated repositories for Client, Account, Transfer
 */

import { PartnerClient, CreateClientDTO, Account, CreateAccountDTO, Transfer, CreateTransferDTO } from './types';

// ═══════════════════════════════════════════════════════════════
// CLIENT REPOSITORY
// ═══════════════════════════════════════════════════════════════

export interface IClientRepository {
  create(partnerId: string, dto: CreateClientDTO): Promise<PartnerClient>;
  findById(clientId: string): Promise<PartnerClient | null>;
  findByPartner(partnerId: string): Promise<PartnerClient[]>;
  update(clientId: string, updates: Partial<PartnerClient>): Promise<PartnerClient>;
}

class ClientRepository implements IClientRepository {
  private clients: Map<string, PartnerClient> = new Map();
  private partnerIndex: Map<string, string[]> = new Map();

  async create(partnerId: string, dto: CreateClientDTO): Promise<PartnerClient> {
    const clientId = `CLT_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const client: PartnerClient = {
      clientId,
      partnerId,
      externalClientId: dto.externalClientId,
      legalName: dto.legalName,
      country: dto.country,
      type: dto.type,
      allowedCurrencies: dto.allowedCurrencies,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: dto.metadata
    };

    this.clients.set(clientId, client);
    
    const partnerClients = this.partnerIndex.get(partnerId) || [];
    partnerClients.push(clientId);
    this.partnerIndex.set(partnerId, partnerClients);

    console.log(`[ClientRepository] ✅ Client created: ${clientId} for partner ${partnerId}`);
    return client;
  }

  async findById(clientId: string): Promise<PartnerClient | null> {
    return this.clients.get(clientId) || null;
  }

  async findByPartner(partnerId: string): Promise<PartnerClient[]> {
    const clientIds = this.partnerIndex.get(partnerId) || [];
    return clientIds.map(id => this.clients.get(id)!).filter(Boolean);
  }

  async update(clientId: string, updates: Partial<PartnerClient>): Promise<PartnerClient> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    const updated = { ...client, ...updates, updatedAt: new Date().toISOString() };
    this.clients.set(clientId, updated);
    return updated;
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT REPOSITORY
// ═══════════════════════════════════════════════════════════════

export interface IAccountRepository {
  create(dto: CreateAccountDTO): Promise<Account>;
  findById(accountId: string): Promise<Account | null>;
  findByClient(clientId: string): Promise<Account[]>;
  updateBalance(accountId: string, newBalance: string, newAvailable: string): Promise<Account>;
}

class AccountRepository implements IAccountRepository {
  private accounts: Map<string, Account> = new Map();
  private clientIndex: Map<string, string[]> = new Map();

  async create(dto: CreateAccountDTO): Promise<Account> {
    const accountId = `ACC_${dto.currency}_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const initialBalance = dto.initialBalance || '0.00';
    
    const account: Account = {
      accountId,
      clientId: dto.clientId,
      currency: dto.currency,
      balance: initialBalance,
      availableBalance: initialBalance,
      reservedBalance: '0.00',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: dto.metadata
    };

    this.accounts.set(accountId, account);
    
    const clientAccounts = this.clientIndex.get(dto.clientId) || [];
    clientAccounts.push(accountId);
    this.clientIndex.set(dto.clientId, clientAccounts);

    console.log(`[AccountRepository] ✅ Account created: ${accountId} (${dto.currency})`);
    return account;
  }

  async findById(accountId: string): Promise<Account | null> {
    return this.accounts.get(accountId) || null;
  }

  async findByClient(clientId: string): Promise<Account[]> {
    const accountIds = this.clientIndex.get(clientId) || [];
    return accountIds.map(id => this.accounts.get(id)!).filter(Boolean);
  }

  async updateBalance(accountId: string, newBalance: string, newAvailable: string): Promise<Account> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const updated = {
      ...account,
      balance: newBalance,
      availableBalance: newAvailable,
      updatedAt: new Date().toISOString(),
      lastTransactionAt: new Date().toISOString()
    };

    this.accounts.set(accountId, updated);
    return updated;
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER REPOSITORY
// ═══════════════════════════════════════════════════════════════

export interface ITransferRepository {
  create(transfer: Omit<Transfer, 'transferId' | 'createdAt'>): Promise<Transfer>;
  findById(transferId: string): Promise<Transfer | null>;
  findByRequestId(transferRequestId: string): Promise<Transfer | null>;
  findByPartner(partnerId: string): Promise<Transfer[]>;
  updateState(transferId: string, state: Transfer['state'], failureReason?: string): Promise<Transfer>;
}

class TransferRepository implements ITransferRepository {
  private transfers: Map<string, Transfer> = new Map();
  private requestIdIndex: Map<string, string> = new Map();
  private partnerIndex: Map<string, string[]> = new Map();

  async create(transfer: Omit<Transfer, 'transferId' | 'createdAt'>): Promise<Transfer> {
    const transferId = `TRF_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const newTransfer: Transfer = {
      ...transfer,
      transferId,
      createdAt: new Date().toISOString()
    };

    this.transfers.set(transferId, newTransfer);
    this.requestIdIndex.set(transfer.transferRequestId, transferId);
    
    const partnerTransfers = this.partnerIndex.get(transfer.partnerId) || [];
    partnerTransfers.push(transferId);
    this.partnerIndex.set(transfer.partnerId, partnerTransfers);

    console.log(`[TransferRepository] ✅ Transfer created: ${transferId}`);
    return newTransfer;
  }

  async findById(transferId: string): Promise<Transfer | null> {
    return this.transfers.get(transferId) || null;
  }

  async findByRequestId(transferRequestId: string): Promise<Transfer | null> {
    const transferId = this.requestIdIndex.get(transferRequestId);
    if (!transferId) return null;
    return this.transfers.get(transferId) || null;
  }

  async findByPartner(partnerId: string): Promise<Transfer[]> {
    const transferIds = this.partnerIndex.get(partnerId) || [];
    return transferIds.map(id => this.transfers.get(id)!).filter(Boolean);
  }

  async updateState(transferId: string, state: Transfer['state'], failureReason?: string): Promise<Transfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer ${transferId} not found`);

    const updated: Transfer = {
      ...transfer,
      state,
      failureReason,
      settledAt: (state === 'SETTLED') ? new Date().toISOString() : transfer.settledAt
    };

    this.transfers.set(transferId, updated);
    return updated;
  }
}

// Singleton instances
export const clientRepository = new ClientRepository();
export const accountRepository = new AccountRepository();
export const transferRepository = new TransferRepository();

