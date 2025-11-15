/**
 * VUSD Circulating Cap Store
 * Manages pledges, transfers, and PoR publications with DAES integration
 */

import { getSupabaseClient } from './supabase-client';

export interface Pledge {
  pledge_id: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'RELEASED';
  amount: number;
  available: number;
  currency: string;
  beneficiary: string;
  custody_account_id?: string; // ID de la cuenta custody origen
  expires_at?: string;
  updated_at: string;
}

export interface TreasuryTransfer {
  id: number;
  external_ref: string;
  amount: number;
  currency: string;
  from_account: string;
  to_account: string;
  created_at: string;
}

export interface PorPublication {
  id: number;
  circ_cap: number;
  pledged_usd: number;
  por_asof: string;
  tx_id: string | null;
  created_at: string;
}

interface CapSnapshot {
  cap: number;
  out: number;
  remaining: number;
}

class VUSDCapStore {
  private pledgesCache: Map<string, Pledge> = new Map();
  private lastSync: Date | null = null;
  private readonly TREASURY_ACCOUNT = 'treasury_vusd';

  // Initialize cache from Supabase
  async initializeCache(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('[VUSD] Supabase not configured, using local mode');
        return;
      }

      const { data, error } = await supabase
        .from('daes_pledges_cache')
        .select('*')
        .eq('status', 'ACTIVE');

      if (error) throw error;

      if (data) {
        this.pledgesCache.clear();
        data.forEach(pledge => {
          this.pledgesCache.set(pledge.pledge_id, {
            pledge_id: pledge.pledge_id,
            status: pledge.status,
            amount: parseFloat(pledge.amount),
            available: parseFloat(pledge.available),
            currency: pledge.currency,
            beneficiary: pledge.beneficiary,
            expires_at: pledge.expires_at,
            updated_at: pledge.updated_at
          });
        });
        this.lastSync = new Date();
      }
    } catch (error) {
      console.error('[VUSD] Error initializing cache:', error);
      throw error;
    }
  }

  // Get active pledges
  async getActivePledges(): Promise<Pledge[]> {
    const now = Date.now();
    const cacheAge = this.lastSync ? now - this.lastSync.getTime() : Infinity;

    // Refresh cache if older than 5 minutes
    if (cacheAge > 5 * 60 * 1000) {
      await this.initializeCache();
    }

    return Array.from(this.pledgesCache.values()).filter(p => p.status === 'ACTIVE');
  }

  // Get circulating cap (sum of available pledges in USD)
  async getCirculatingCap(): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return 0;

      const { data, error } = await supabase
        .from('daes_pledges_cache')
        .select('available')
        .eq('status', 'ACTIVE')
        .eq('currency', 'USD');

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      return data.reduce((sum, p) => sum + parseFloat(p.available), 0);
    } catch (error) {
      console.error('[VUSD] Error getting circulating cap:', error);
      return 0;
    }
  }

  // Get circulating out (sum of transfers from treasury)
  async getCirculatingOut(): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return 0;

      const { data, error } = await supabase
        .from('treasury_transfers')
        .select('amount')
        .eq('currency', 'USD')
        .eq('from_account', this.TREASURY_ACCOUNT);

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      return data.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    } catch (error) {
      console.error('[VUSD] Error getting circulating out:', error);
      return 0;
    }
  }

  // Get total pledged USD (from all pledges, not just available)
  async getTotalPledgedUSD(): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return 0;

      const { data, error } = await supabase
        .from('daes_pledges_cache')
        .select('amount')
        .eq('status', 'ACTIVE')
        .eq('currency', 'USD');

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      return data.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    } catch (error) {
      console.error('[VUSD] Error getting total pledged USD:', error);
      return 0;
    }
  }

  // Create a new transfer with cap enforcement
  async createTransfer(transfer: {
    external_ref: string;
    amount: number;
    to_account: string;
  }): Promise<{ ok: boolean; cap_snapshot: CapSnapshot }> {
    try {
      // Check cap
      const [cap, out] = await Promise.all([
        this.getCirculatingCap(),
        this.getCirculatingOut()
      ]);

      if (out + transfer.amount > cap) {
        throw new Error(
          `Transfer ${transfer.amount.toFixed(2)} exceeds cap. cap=${cap.toFixed(2)} out=${out.toFixed(2)}`
        );
      }

      // Insert transfer
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from('treasury_transfers')
        .insert({
          external_ref: transfer.external_ref,
          amount: transfer.amount,
          currency: 'USD',
          from_account: this.TREASURY_ACCOUNT,
          to_account: transfer.to_account
        });

      if (error) {
        if (error.message.includes('duplicate key')) {
          throw new Error('External reference already exists');
        }
        throw error;
      }

      return {
        ok: true,
        cap_snapshot: { cap, out, remaining: cap - out }
      };
    } catch (error) {
      console.error('[VUSD] Error creating transfer:', error);
      throw error;
    }
  }

  // Get recent transfers
  async getRecentTransfers(limit = 20): Promise<TreasuryTransfer[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('treasury_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[VUSD] Error getting recent transfers:', error);
      return [];
    }
  }

  // Create a new pledge
  /**
   * Verificar si ya existe un pledge activo para una cuenta custody
   */
  async checkDuplicatePledge(custodyAccountId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return false;

      const { data, error } = await supabase
        .from('daes_pledges_cache')
        .select('pledge_id')
        .eq('custody_account_id', custodyAccountId)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (error) {
        console.error('[VUSD] Error checking duplicate pledge:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('[VUSD] Error checking duplicate pledge:', error);
      return false;
    }
  }

  async createPledge(pledge: {
    amount: number;
    currency: string;
    beneficiary: string;
    custody_account_id?: string;
    expires_at?: string;
  }): Promise<Pledge> {
    try {
      // ========================================
      // VALIDACIÓN 1: VERIFICAR CAPITAL DISPONIBLE
      // ========================================
      if (pledge.custody_account_id) {
        // Obtener todos los pledges activos de esta cuenta
        const activePledges = await this.getActivePledges();
        const totalReserved = activePledges
          .filter(p => p.custody_account_id === pledge.custody_account_id && p.status === 'active')
          .reduce((sum, p) => sum + p.amount, 0);

        // Importar custodyStore para obtener el balance total
        const { custodyStore } = await import('./custody-store');
        const accounts = custodyStore.getAccounts();
        const custodyAccount = accounts.find(a => a.id === pledge.custody_account_id);

        if (custodyAccount) {
          const availableBalance = custodyAccount.totalBalance - totalReserved;

          console.log('[VUSD Store] 🔍 Validación de capital en store:', {
            account: custodyAccount.accountName,
            totalBalance: custodyAccount.totalBalance,
            currentlyReserved: totalReserved,
            available: availableBalance,
            requested: pledge.amount,
            willBeAvailable: availableBalance - pledge.amount
          });

          if (availableBalance < pledge.amount) {
            throw new Error(
              `❌ CAPITAL INSUFICIENTE\n\n` +
              `Cuenta: ${custodyAccount.accountName}\n` +
              `Total: ${custodyAccount.currency} ${custodyAccount.totalBalance.toLocaleString()}\n` +
              `Ya Reservado: ${custodyAccount.currency} ${totalReserved.toLocaleString()}\n` +
              `Disponible: ${custodyAccount.currency} ${availableBalance.toLocaleString()}\n` +
              `Solicitado: ${pledge.currency} ${pledge.amount.toLocaleString()}\n\n` +
              `Solución:\n` +
              `1. Reduce el monto del pledge\n` +
              `2. Libera un pledge existente de esta cuenta\n` +
              `3. Usa una cuenta con más capital disponible`
            );
          }
        }
      }

      // Generate pledge ID
      const pledge_id = `PLG_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const newPledge: Pledge = {
        pledge_id,
        status: 'ACTIVE',
        amount: pledge.amount,
        available: pledge.amount,
        currency: pledge.currency,
        beneficiary: pledge.beneficiary,
        custody_account_id: pledge.custody_account_id,
        expires_at: pledge.expires_at,
        updated_at: new Date().toISOString()
      };

      // Insert into cache
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from('daes_pledges_cache')
        .insert({
          pledge_id: newPledge.pledge_id,
          status: newPledge.status,
          amount: newPledge.amount,
          available: newPledge.available,
          currency: newPledge.currency,
          beneficiary: newPledge.beneficiary,
          custody_account_id: newPledge.custody_account_id,
          expires_at: newPledge.expires_at,
          updated_at: newPledge.updated_at
        });

      if (error) throw error;

      // Update local cache
      this.pledgesCache.set(pledge_id, newPledge);

      console.log('[VUSD] ✅ Pledge creado sin duplicados para custody:', pledge.custody_account_id || 'manual');

      return newPledge;
    } catch (error) {
      console.error('[VUSD] Error creating pledge:', error);
      throw error;
    }
  }

  /**
   * Eliminar pledge (marca como RELEASED y libera capital)
   */
  async deletePledge(pledge_id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Obtener el pledge antes de eliminarlo para logs
      const { data: pledge, error: fetchError } = await supabase
        .from('daes_pledges_cache')
        .select('*')
        .eq('pledge_id', pledge_id)
        .single();

      if (fetchError || !pledge) {
        throw new Error('Pledge not found');
      }

      // Marcar como RELEASED en lugar de eliminar físicamente
      const { error: updateError } = await supabase
        .from('daes_pledges_cache')
        .update({
          status: 'RELEASED',
          updated_at: new Date().toISOString()
        })
        .eq('pledge_id', pledge_id);

      if (updateError) throw updateError;

      // Eliminar del cache local
      this.pledgesCache.delete(pledge_id);

      console.log('[VUSD] ✅ Pledge eliminado (RELEASED):', {
        pledge_id,
        amount: pledge.amount,
        currency: pledge.currency,
        custody_account_id: pledge.custody_account_id
      });

      // Si tiene custody_account_id, el capital queda disponible nuevamente
      if (pledge.custody_account_id) {
        console.log('[VUSD] 🔓 Capital liberado para cuenta custody:', pledge.custody_account_id);
      }

    } catch (error) {
      console.error('[VUSD] Error deleting pledge:', error);
      throw error;
    }
  }

  // Publish PoR
  async publishPor(): Promise<PorPublication> {
    try {
      const [cap, pledged] = await Promise.all([
        this.getCirculatingCap(),
        this.getTotalPledgedUSD()
      ]);

      const por_asof = new Date().toISOString();

      // Simulate blockchain TX (in production, call actual blockchain API)
      const tx_id = `0x${Math.random().toString(16).substring(2, 18)}${Math.random().toString(16).substring(2, 18)}${Math.random().toString(16).substring(2, 18)}${Math.random().toString(16).substring(2, 18)}`;

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase
        .from('por_publications')
        .insert({
          circ_cap: cap,
          pledged_usd: pledged,
          por_asof,
          tx_id
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[VUSD] Error publishing PoR:', error);
      throw error;
    }
  }

  // Get recent PoR publications
  async getRecentPorPublications(limit = 10): Promise<PorPublication[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('por_publications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[VUSD] Error getting PoR publications:', error);
      return [];
    }
  }

  // Refresh pledges cache from external API (simulated)
  async refreshPledgesFromDaes(): Promise<void> {
    try {
      // In production, this would call the DAES API
      // For now, we just reload from database
      await this.initializeCache();
      console.log('[VUSD] Pledges cache refreshed');
    } catch (error) {
      console.error('[VUSD] Error refreshing pledges:', error);
      throw error;
    }
  }
}

export const vusdCapStore = new VUSDCapStore();

// Initialize on module load
vusdCapStore.initializeCache().catch(console.error);
