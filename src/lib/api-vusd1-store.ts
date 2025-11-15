/**
 * API VUSD1 Store
 * Sistema completo de Pledges, Payouts, Attestations y Webhooks HMAC
 * Basado en especificaciones DAES para integración con Anchor
 */

import { getSupabaseClient } from './supabase-client';
import CryptoJS from 'crypto-js';

// =====================================================
// TYPES
// =====================================================

export interface ApiPledge {
  id: string;
  pledge_id: string;
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONSUMED';
  amount: number;
  available: number;
  currency: string;
  beneficiary: string;
  external_ref?: string;
  segregation_priority: number;
  expires_at?: string;
  released_at?: string;
  document_hash?: string;
  hmac_signature?: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

export interface ApiPayout {
  id: string;
  payout_id: string;
  pledge_id: string;
  external_ref: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  destination_account: string;
  destination_details: Record<string, any>;
  failure_reason?: string;
  webhook_sent: boolean;
  webhook_sent_at?: string;
  completed_at?: string;
  failed_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface ApiAttestation {
  id: string;
  attestation_id: string;
  as_of_date: string;
  circulating_cap: number;
  pledged_usd: number;
  unpledged_usd: number;
  total_reserves: number;
  document_hash: string;
  document_url?: string;
  signature: string;
  signing_key_id: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by?: string;
}

export interface ApiEvent {
  id: string;
  event_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  signature?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface ReserveSummary {
  as_of_date: string;
  circulating_cap: number;
  pledged_usd: number;
  unpledged_usd: number;
  total_reserves: number;
  pledge_count: number;
  active_payouts: number;
}

// =====================================================
// API VUSD1 STORE CLASS
// =====================================================

class ApiVUSD1Store {
  private readonly ANCHOR_WEBHOOK_URL = 'https://anchor.vergy.world/webhooks/daes';
  private readonly HMAC_SECRET = import.meta.env.VITE_DAES_HMAC_SECRET || 'dev-secret-key';
  private readonly SIGNING_KEY_ID = 'DAES-2025-KEY-001';

  // =====================================================
  // HMAC UTILITIES
  // =====================================================

  /**
   * Genera firma HMAC-SHA256 para webhooks
   */
  generateHMAC(timestamp: string, payload: string): string {
    const message = timestamp + payload;
    const hash = CryptoJS.HmacSHA256(message, this.HMAC_SECRET);
    return CryptoJS.enc.Base64.stringify(hash);
  }

  /**
   * Verifica firma HMAC recibida
   */
  verifyHMAC(timestamp: string, payload: string, signature: string): boolean {
    const expectedSignature = this.generateHMAC(timestamp, payload);
    return signature === expectedSignature;
  }

  /**
   * Genera hash SHA256 de documento
   */
  generateDocumentHash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  // =====================================================
  // PLEDGES ENDPOINTS
  // =====================================================

  /**
   * POST /v1/pledges - Crear nuevo pledge
   */
  async createPledge(params: {
    amount: number;
    currency: string;
    beneficiary: string;
    external_ref?: string;
    expires_at?: string;
    metadata?: Record<string, any>;
    idempotency_key?: string;
  }): Promise<ApiPledge> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // ========================================
      // VALIDACIÓN 1: VERIFICAR DUPLICADOS POR CUSTODY ACCOUNT
      // ========================================
      if (params.metadata?.custody_account_id) {
        const { data: existingPledges, error: checkError } = await supabase
          .from('api_pledges')
          .select('pledge_id, amount, currency')
          .eq('status', 'ACTIVE')
          .contains('metadata', { custody_account_id: params.metadata.custody_account_id });

        if (checkError) {
          console.warn('[API-VUSD1] Error checking duplicates:', checkError);
        } else if (existingPledges && existingPledges.length > 0) {
          // Calcular capital total reservado
          const totalReserved = existingPledges.reduce((sum, p) => sum + p.amount, 0);

          console.log('[API-VUSD1] 🔍 Pledges activos detectados:', {
            custody_account_id: params.metadata.custody_account_id,
            existing_count: existingPledges.length,
            total_reserved: totalReserved,
            new_amount: params.amount
          });

          // Si ya hay pledges activos, advertir
          console.warn(
            `[API-VUSD1] ⚠️ ADVERTENCIA: Ya existen ${existingPledges.length} pledge(s) activo(s) ` +
            `para custody_account_id: ${params.metadata.custody_account_id}`
          );
        }
      }

      // Check idempotency
      if (params.idempotency_key) {
        const existing = await this.checkIdempotency(params.idempotency_key);
        if (existing) {
          console.log('[API-VUSD1] Idempotency key found, returning cached response');
          return existing.response_body.data;
        }
      }

      // Generate pledge_id
      const pledge_id = `PLG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      // Generate document hash
      const documentData = JSON.stringify({
        pledge_id,
        amount: params.amount,
        currency: params.currency,
        beneficiary: params.beneficiary,
        timestamp
      });
      const document_hash = this.generateDocumentHash(documentData);

      // Generate HMAC signature
      const hmac_signature = this.generateHMAC(timestamp, documentData);

      // Insert pledge
      const { data, error } = await supabase
        .from('api_pledges')
        .insert({
          pledge_id,
          status: 'ACTIVE',
          amount: params.amount,
          available: params.amount,
          currency: params.currency,
          beneficiary: params.beneficiary,
          external_ref: params.external_ref,
          segregation_priority: 1,
          expires_at: params.expires_at,
          document_hash,
          hmac_signature,
          metadata: params.metadata || {},
          created_by: 'api_vusd1'
        })
        .select()
        .single();

      if (error) throw error;

      // Log event
      await this.logEvent({
        event_type: 'PLEDGE_CREATED',
        entity_type: 'PLEDGE',
        entity_id: pledge_id,
        payload: { pledge_id, amount: params.amount, currency: params.currency }
      });

      // Store idempotency
      if (params.idempotency_key) {
        await this.storeIdempotency(params.idempotency_key, 'POST', '/v1/pledges', params, 201, { data });
      }

      // Queue webhook
      await this.queueWebhook({
        event_type: 'pledge.created',
        data: {
          pledge_id,
          status: 'ACTIVE',
          amount: params.amount,
          available: params.amount,
          currency: params.currency,
          beneficiary: params.beneficiary,
          document_hash
        }
      });

      console.log(`[API-VUSD1] ✅ Pledge created: ${pledge_id}`);
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error creating pledge:', error);
      throw error;
    }
  }

  /**
   * GET /v1/pledges - Listar pledges
   */
  async listPledges(filters?: {
    status?: string;
    currency?: string;
    beneficiary?: string;
  }): Promise<ApiPledge[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      let query = supabase.from('api_pledges').select('*').order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.currency) query = query.eq('currency', filters.currency);
      if (filters?.beneficiary) query = query.eq('beneficiary', filters.beneficiary);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('[API-VUSD1] Error listing pledges:', error);
      throw error;
    }
  }

  /**
   * GET /v1/pledges/:pledge_id - Obtener pledge específico
   */
  async getPledge(pledge_id: string): Promise<ApiPledge | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('api_pledges')
        .select('*')
        .eq('pledge_id', pledge_id)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error getting pledge:', error);
      return null;
    }
  }

  /**
   * PUT /v1/pledges/:pledge_id/adjust - Ajustar monto disponible
   */
  async adjustPledge(pledge_id: string, adjustment: number, reason: string): Promise<ApiPledge> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Get current pledge
      const pledge = await this.getPledge(pledge_id);
      if (!pledge) throw new Error('Pledge not found');

      const new_available = pledge.available + adjustment;
      if (new_available < 0) throw new Error('Insufficient available balance');
      if (new_available > pledge.amount) throw new Error('Available cannot exceed pledge amount');

      // Update pledge
      const { data, error } = await supabase
        .from('api_pledges')
        .update({
          available: new_available,
          updated_by: 'api_vusd1'
        })
        .eq('pledge_id', pledge_id)
        .select()
        .single();

      if (error) throw error;

      // Log event
      await this.logEvent({
        event_type: 'PLEDGE_ADJUSTED',
        entity_type: 'PLEDGE',
        entity_id: pledge_id,
        payload: { pledge_id, adjustment, reason, new_available }
      });

      // Queue webhook
      await this.queueWebhook({
        event_type: 'pledge.adjusted',
        data: {
          pledge_id,
          adjustment,
          available: new_available,
          reason
        }
      });

      console.log(`[API-VUSD1] ✅ Pledge adjusted: ${pledge_id}, adjustment: ${adjustment}`);
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error adjusting pledge:', error);
      throw error;
    }
  }

  /**
   * PUT /v1/pledges/:pledge_id/release - Liberar pledge
   */
  async releasePledge(pledge_id: string, reason: string): Promise<ApiPledge> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('api_pledges')
        .update({
          status: 'RELEASED',
          released_at: new Date().toISOString(),
          updated_by: 'api_vusd1'
        })
        .eq('pledge_id', pledge_id)
        .select()
        .single();

      if (error) throw error;

      // Log event
      await this.logEvent({
        event_type: 'PLEDGE_RELEASED',
        entity_type: 'PLEDGE',
        entity_id: pledge_id,
        payload: { pledge_id, reason }
      });

      // Queue webhook
      await this.queueWebhook({
        event_type: 'pledge.released',
        data: { pledge_id, status: 'RELEASED', reason }
      });

      console.log(`[API-VUSD1] ✅ Pledge released: ${pledge_id}`);
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error releasing pledge:', error);
      throw error;
    }
  }

  /**
   * DELETE Pledge - Eliminar físicamente un pledge
   */
  async deletePledge(pledge_id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Obtener el pledge antes de eliminarlo para logs
      const { data: pledge, error: fetchError } = await supabase
        .from('api_pledges')
        .select('*')
        .eq('pledge_id', pledge_id)
        .single();

      if (fetchError) throw fetchError;
      if (!pledge) throw new Error('Pledge not found');

      // Eliminar el pledge
      const { error: deleteError } = await supabase
        .from('api_pledges')
        .delete()
        .eq('pledge_id', pledge_id);

      if (deleteError) throw deleteError;

      // Log event
      await this.logEvent({
        event_type: 'PLEDGE_DELETED',
        entity_type: 'PLEDGE',
        entity_id: pledge_id,
        payload: {
          pledge_id,
          amount: pledge.amount,
          currency: pledge.currency,
          beneficiary: pledge.beneficiary
        }
      });

      // Queue webhook
      await this.queueWebhook({
        event_type: 'pledge.deleted',
        data: {
          pledge_id,
          amount: pledge.amount,
          currency: pledge.currency,
          deleted_at: new Date().toISOString()
        }
      });

      console.log(`[API-VUSD1] ✅ Pledge deleted: ${pledge_id}`);

    } catch (error) {
      console.error('[API-VUSD1] Error deleting pledge:', error);
      throw error;
    }
  }

  /**
   * Delete all pledges associated with a custody account
   */
  async deletePledgesByCustodyAccountId(custody_account_id: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      console.log(`[API-VUSD1] 🗑️ Deleting pledges for custody account: ${custody_account_id}`);

      // Get all pledges for this custody account
      const { data: pledges, error: fetchError } = await supabase
        .from('api_pledges')
        .select('*')
        .contains('metadata', { custody_account_id });

      if (fetchError) throw fetchError;

      if (!pledges || pledges.length === 0) {
        console.log(`[API-VUSD1] ℹ️ No pledges found for custody account: ${custody_account_id}`);
        return 0;
      }

      console.log(`[API-VUSD1] 📊 Found ${pledges.length} pledges to delete`);

      // Delete each pledge
      let deletedCount = 0;
      for (const pledge of pledges) {
        try {
          await this.deletePledge(pledge.pledge_id);
          deletedCount++;
          console.log(`[API-VUSD1] ✅ Deleted pledge ${pledge.pledge_id} (${deletedCount}/${pledges.length})`);
        } catch (error) {
          console.error(`[API-VUSD1] ❌ Error deleting pledge ${pledge.pledge_id}:`, error);
        }
      }

      console.log(`[API-VUSD1] ✅ Deleted ${deletedCount} pledges for custody account: ${custody_account_id}`);
      return deletedCount;

    } catch (error) {
      console.error('[API-VUSD1] Error deleting pledges by custody account:', error);
      throw error;
    }
  }

  // =====================================================
  // PAYOUTS ENDPOINTS
  // =====================================================

  /**
   * POST /v1/payouts - Crear payout (retiro VUSD→USD)
   */
  async createPayout(params: {
    pledge_id: string;
    amount: number;
    destination_account: string;
    destination_details?: Record<string, any>;
    external_ref?: string;
    metadata?: Record<string, any>;
    idempotency_key?: string;
  }): Promise<ApiPayout> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Check idempotency
      if (params.idempotency_key) {
        const existing = await this.checkIdempotency(params.idempotency_key);
        if (existing) {
          console.log('[API-VUSD1] Idempotency key found, returning cached payout');
          return existing.response_body.data;
        }
      }

      // Check pledge exists and has sufficient balance
      const pledge = await this.getPledge(params.pledge_id);
      if (!pledge) throw new Error('Pledge not found');
      if (pledge.status !== 'ACTIVE') throw new Error('Pledge is not active');
      if (pledge.available < params.amount) throw new Error('Insufficient pledge balance');

      // Generate payout_id
      const payout_id = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const external_ref = params.external_ref || `EXT_${Date.now()}`;

      // Create payout
      const { data: payout, error: payoutError } = await supabase
        .from('api_payouts')
        .insert({
          payout_id,
          pledge_id: params.pledge_id,
          external_ref,
          amount: params.amount,
          currency: pledge.currency,
          status: 'PENDING',
          destination_account: params.destination_account,
          destination_details: params.destination_details || {},
          metadata: params.metadata || {},
          created_by: 'api_vusd1'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Consume pledge available
      await this.adjustPledge(params.pledge_id, -params.amount, `Payout ${payout_id}`);

      // Log event
      await this.logEvent({
        event_type: 'PAYOUT_CREATED',
        entity_type: 'PAYOUT',
        entity_id: payout_id,
        payload: { payout_id, pledge_id: params.pledge_id, amount: params.amount }
      });

      // Store idempotency
      if (params.idempotency_key) {
        await this.storeIdempotency(params.idempotency_key, 'POST', '/v1/payouts', params, 201, { data: payout });
      }

      console.log(`[API-VUSD1] ✅ Payout created: ${payout_id}`);
      return payout;

    } catch (error) {
      console.error('[API-VUSD1] Error creating payout:', error);
      throw error;
    }
  }

  /**
   * PUT /v1/payouts/:payout_id/complete - Marcar payout como completado
   */
  async completePayout(payout_id: string): Promise<ApiPayout> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('api_payouts')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('payout_id', payout_id)
        .select()
        .single();

      if (error) throw error;

      // Log event
      await this.logEvent({
        event_type: 'PAYOUT_COMPLETED',
        entity_type: 'PAYOUT',
        entity_id: payout_id,
        payload: { payout_id, status: 'COMPLETED' }
      });

      // Queue webhook
      await this.queueWebhook({
        event_type: 'payout.completed',
        data: {
          payout_id,
          pledge_id: data.pledge_id,
          amount: data.amount,
          status: 'COMPLETED',
          external_ref: data.external_ref
        }
      });

      console.log(`[API-VUSD1] ✅ Payout completed: ${payout_id}`);
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error completing payout:', error);
      throw error;
    }
  }

  /**
   * GET /v1/transactions/:external_ref - Obtener transacción por referencia externa
   */
  async getTransaction(external_ref: string): Promise<ApiPayout | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('api_payouts')
        .select('*')
        .eq('external_ref', external_ref)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error getting transaction:', error);
      return null;
    }
  }

  // =====================================================
  // RESERVES & ATTESTATIONS ENDPOINTS
  // =====================================================

  /**
   * GET /v1/reserves/summary - Resumen de reservas
   */
  async getReservesSummary(): Promise<ReserveSummary> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Calculate circulating cap
      const { data: capData } = await supabase.rpc('calculate_circulating_cap');
      const circulating_cap = capData || 0;

      // Calculate pledged USD
      const { data: pledgedData } = await supabase.rpc('calculate_pledged_usd');
      const pledged_usd = pledgedData || 0;

      // Count pledges
      const { count: pledge_count } = await supabase
        .from('api_pledges')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // Count active payouts
      const { count: active_payouts } = await supabase
        .from('api_payouts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'PROCESSING']);

      // For demo: unpledged = pledged * 0.1 (10% buffer)
      const unpledged_usd = pledged_usd * 0.1;
      const total_reserves = pledged_usd + unpledged_usd;

      return {
        as_of_date: new Date().toISOString().split('T')[0],
        circulating_cap,
        pledged_usd,
        unpledged_usd,
        total_reserves,
        pledge_count: pledge_count || 0,
        active_payouts: active_payouts || 0
      };

    } catch (error) {
      console.error('[API-VUSD1] Error getting reserves summary:', error);
      throw error;
    }
  }

  /**
   * POST /v1/attestations - Crear nueva attestation
   */
  async createAttestation(params: {
    as_of_date?: string;
    document_url?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiAttestation> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      // Get current reserves
      const summary = await this.getReservesSummary();

      const attestation_id = `ATT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      // Generate document hash
      const documentData = JSON.stringify({
        attestation_id,
        ...summary,
        timestamp
      });
      const document_hash = this.generateDocumentHash(documentData);

      // Generate signature
      const signature = this.generateHMAC(timestamp, documentData);

      // Insert attestation
      const { data, error } = await supabase
        .from('api_attestations')
        .insert({
          attestation_id,
          as_of_date: params.as_of_date || summary.as_of_date,
          circulating_cap: summary.circulating_cap,
          pledged_usd: summary.pledged_usd,
          unpledged_usd: summary.unpledged_usd,
          total_reserves: summary.total_reserves,
          document_hash,
          document_url: params.document_url,
          signature,
          signing_key_id: this.SIGNING_KEY_ID,
          metadata: params.metadata || {},
          created_by: 'api_vusd1'
        })
        .select()
        .single();

      if (error) throw error;

      // Log event
      await this.logEvent({
        event_type: 'ATTESTATION_CREATED',
        entity_type: 'ATTESTATION',
        entity_id: attestation_id,
        payload: { attestation_id, circulating_cap: summary.circulating_cap }
      });

      console.log(`[API-VUSD1] ✅ Attestation created: ${attestation_id}`);
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error creating attestation:', error);
      throw error;
    }
  }

  /**
   * GET /v1/attestations/latest - Obtener última attestation
   */
  async getLatestAttestation(): Promise<ApiAttestation | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('api_attestations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('[API-VUSD1] Error getting latest attestation:', error);
      return null;
    }
  }

  // =====================================================
  // WEBHOOKS
  // =====================================================

  /**
   * Queue webhook for delivery
   */
  async queueWebhook(payload: WebhookPayload): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const webhook_id = `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const payloadString = JSON.stringify(payload);

      // Generate HMAC signature
      const hmac_signature = this.generateHMAC(timestamp, payloadString);

      // Insert webhook
      await supabase.from('api_webhooks_queue').insert({
        webhook_id,
        event_type: payload.event_type,
        endpoint_url: this.ANCHOR_WEBHOOK_URL,
        payload,
        hmac_signature,
        status: 'PENDING',
        attempts: 0,
        max_attempts: 10,
        next_retry_at: timestamp
      });

      console.log(`[API-VUSD1] 📨 Webhook queued: ${webhook_id}, event: ${payload.event_type}`);

    } catch (error) {
      console.error('[API-VUSD1] Error queuing webhook:', error);
    }
  }

  // =====================================================
  // IDEMPOTENCY
  // =====================================================

  async checkIdempotency(key: string): Promise<any> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('api_idempotency_keys')
        .select('*')
        .eq('idempotency_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) return null;
      return data;

    } catch (error) {
      return null;
    }
  }

  async storeIdempotency(
    key: string,
    method: string,
    path: string,
    payload: any,
    status: number,
    response: any
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      await supabase.from('api_idempotency_keys').insert({
        idempotency_key: key,
        request_method: method,
        request_path: path,
        request_payload: payload,
        response_status: status,
        response_body: response
      });

    } catch (error) {
      console.error('[API-VUSD1] Error storing idempotency:', error);
    }
  }

  // =====================================================
  // EVENTS LOG
  // =====================================================

  async logEvent(params: {
    event_type: string;
    entity_type: string;
    entity_id: string;
    payload: Record<string, any>;
    user_id?: string;
  }): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const event_id = `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await supabase.from('api_events').insert({
        event_id,
        event_type: params.event_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        payload: params.payload,
        user_id: params.user_id || 'system'
      });

    } catch (error) {
      console.error('[API-VUSD1] Error logging event:', error);
    }
  }

  /**
   * GET /v1/events - Listar eventos
   */
  async listEvents(filters?: {
    event_type?: string;
    entity_type?: string;
    entity_id?: string;
    limit?: number;
  }): Promise<ApiEvent[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      let query = supabase
        .from('api_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.event_type) query = query.eq('event_type', filters.event_type);
      if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type);
      if (filters?.entity_id) query = query.eq('entity_id', filters.entity_id);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('[API-VUSD1] Error listing events:', error);
      throw error;
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const apiVUSD1Store = new ApiVUSD1Store();
