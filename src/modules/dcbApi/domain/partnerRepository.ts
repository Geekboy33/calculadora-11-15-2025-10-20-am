/**
 * Partner Repository - Digital Commercial Bank Ltd
 * Data access layer for Partner entities
 * 
 * @module DCB-API/Domain/PartnerRepository
 */

import { Partner, CreatePartnerDTO } from './types';

/**
 * Partner Repository Interface
 * Abstraction layer para permitir cambio entre in-memory y DB real
 */
export interface IPartnerRepository {
  create(dto: CreatePartnerDTO, clientId: string, clientSecretHash: string): Promise<Partner>;
  findById(partnerId: string): Promise<Partner | null>;
  findByClientId(clientId: string): Promise<Partner | null>;
  update(partnerId: string, updates: Partial<Partner>): Promise<Partner>;
  list(): Promise<Partner[]>;
  delete(partnerId: string): Promise<boolean>;
}

/**
 * In-Memory Implementation (Production-ready para inicio)
 * TODO: Reemplazar con PostgreSQL/MongoDB cuando se escale
 */
export class PartnerRepository implements IPartnerRepository {
  private partners: Map<string, Partner> = new Map();
  private clientIdIndex: Map<string, string> = new Map(); // clientId -> partnerId

  async create(dto: CreatePartnerDTO, clientId: string, clientSecretHash: string): Promise<Partner> {
    const partnerId = `PTN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    const partner: Partner = {
      partnerId,
      name: dto.name,
      clientId,
      clientSecretHash,
      allowedCurrencies: dto.allowedCurrencies,
      webhookUrl: dto.webhookUrl,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: dto.metadata
    };

    this.partners.set(partnerId, partner);
    this.clientIdIndex.set(clientId, partnerId);

    console.log(`[PartnerRepository] ✅ Partner created: ${partnerId} (${dto.name})`);
    return partner;
  }

  async findById(partnerId: string): Promise<Partner | null> {
    return this.partners.get(partnerId) || null;
  }

  async findByClientId(clientId: string): Promise<Partner | null> {
    const partnerId = this.clientIdIndex.get(clientId);
    if (!partnerId) return null;
    return this.partners.get(partnerId) || null;
  }

  async update(partnerId: string, updates: Partial<Partner>): Promise<Partner> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    const updated: Partner = {
      ...partner,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.partners.set(partnerId, updated);
    return updated;
  }

  async list(): Promise<Partner[]> {
    return Array.from(this.partners.values());
  }

  async delete(partnerId: string): Promise<boolean> {
    const partner = this.partners.get(partnerId);
    if (!partner) return false;

    this.clientIdIndex.delete(partner.clientId);
    this.partners.delete(partnerId);
    return true;
  }
}

// Singleton instance
export const partnerRepository = new PartnerRepository();

