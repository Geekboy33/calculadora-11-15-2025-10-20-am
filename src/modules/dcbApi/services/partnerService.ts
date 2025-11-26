/**
 * Partner Service - Digital Commercial Bank Ltd / DAES Partner API
 * Business logic for partner management
 */

import { partnerRepository } from '../domain/partnerRepository';
import { CreatePartnerDTO, PartnerCredentials, Partner } from '../domain/types';
import * as crypto from 'crypto';

export class PartnerService {
  /**
   * Crea un nuevo partner y retorna credenciales (clientSecret solo una vez)
   */
  async createPartner(dto: CreatePartnerDTO): Promise<PartnerCredentials> {
    // Generar clientId y clientSecret
    const clientId = `dcb_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

    // Crear partner
    const partner = await partnerRepository.create(dto, clientId, clientSecretHash);

    console.log(`[PartnerService] ✅ Partner created: ${partner.name}`);
    console.log(`[PartnerService] 🔑 ClientID: ${clientId}`);
    console.log(`[PartnerService] ⚠️  ClientSecret generado (solo se mostrará una vez)`);

    return {
      partnerId: partner.partnerId,
      clientId,
      clientSecret // ⚠️ Solo se retorna aquí
    };
  }

  /**
   * Valida credenciales de partner
   */
  async validateCredentials(clientId: string, clientSecret: string): Promise<Partner | null> {
    const partner = await partnerRepository.findByClientId(clientId);
    if (!partner) {
      console.log(`[PartnerService] ❌ Partner not found for clientId: ${clientId}`);
      return null;
    }

    if (partner.status !== 'ACTIVE') {
      console.log(`[PartnerService] ❌ Partner inactive: ${partner.partnerId}`);
      return null;
    }

    const secretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');
    if (secretHash !== partner.clientSecretHash) {
      console.log(`[PartnerService] ❌ Invalid credentials for partner: ${partner.partnerId}`);
      return null;
    }

    console.log(`[PartnerService] ✅ Credentials validated: ${partner.name}`);
    return partner;
  }

  /**
   * Lista todos los partners (admin only)
   */
  async listPartners(): Promise<Partner[]> {
    return await partnerRepository.list();
  }

  /**
   * Obtiene partner por ID
   */
  async getPartner(partnerId: string): Promise<Partner | null> {
    return await partnerRepository.findById(partnerId);
  }
}

export const partnerService = new PartnerService();

