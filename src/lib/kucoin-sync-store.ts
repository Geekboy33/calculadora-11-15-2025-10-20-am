/**
 * KuCoin Sync Store
 * Sincroniza trades y balances de KuCoin Trading Spot con Supabase
 * Permite acceso desde múltiples dispositivos (incluyendo wallet móvil)
 */

import { getSupabaseClient } from './supabase-client';

// Tipos para KuCoin Trading
export interface KuCoinTrade {
  id: string;
  pair: string;
  side: 'BUY' | 'SELL';
  base_currency: string;
  quote_currency: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  total_with_fee?: number;
  net_received?: number;
  timestamp: string;
  status: string;
  balance_after: Record<string, number>;
  user_id?: string;
}

export interface KuCoinBalance {
  id: string;
  currency: string;
  type: 'main' | 'trade';
  balance: string;
  available: string;
  holds: string;
  user_id?: string;
  updated_at?: string;
}

export interface KuCoinLoadHistory {
  id: string;
  type: string;
  from: string;
  from_id: string;
  to: string;
  amount: number;
  currency: string;
  timestamp: string;
  balance_after: string;
  user_id?: string;
}

// Tabla names
const TRADES_TABLE = 'kucoin_trades';
const BALANCES_TABLE = 'kucoin_balances';
const LOADS_TABLE = 'kucoin_loads';

// Listeners
type TradeListener = (trades: KuCoinTrade[]) => void;
type BalanceListener = (balances: KuCoinBalance[]) => void;

class KuCoinSyncStore {
  private tradeListeners: TradeListener[] = [];
  private balanceListeners: BalanceListener[] = [];
  private isOnline: boolean = false;
  private userId: string = 'default_user';

  constructor() {
    this.checkConnection();
  }

  private async checkConnection(): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[KuCoin Sync] ⚠️ Supabase no configurado - usando modo LOCAL');
      this.isOnline = false;
      return false;
    }
    this.isOnline = true;
    console.log('[KuCoin Sync] ✅ Conectado a Supabase');
    return true;
  }

  // ========== TRADES ==========

  async saveTrade(trade: KuCoinTrade): Promise<boolean> {
    // Siempre guardar en localStorage primero
    this.saveTradeLocal(trade);

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[KuCoin Sync] Trade guardado solo en LOCAL:', trade.id);
      return true;
    }

    try {
      const { error } = await supabase
        .from(TRADES_TABLE)
        .upsert({
          id: trade.id,
          pair: trade.pair,
          side: trade.side,
          base_currency: trade.base_currency,
          quote_currency: trade.quote_currency,
          amount: trade.amount,
          price: trade.price,
          total: trade.total,
          fee: trade.fee,
          total_with_fee: trade.total_with_fee,
          net_received: trade.net_received,
          timestamp: trade.timestamp,
          status: trade.status,
          balance_after: trade.balance_after,
          user_id: this.userId
        }, { onConflict: 'id' });

      if (error) {
        console.error('[KuCoin Sync] Error guardando trade en Supabase:', error);
        return false;
      }

      console.log('[KuCoin Sync] ✅ Trade sincronizado con Supabase:', trade.id);
      return true;
    } catch (err) {
      console.error('[KuCoin Sync] Error de conexión:', err);
      return false;
    }
  }

  private saveTradeLocal(trade: KuCoinTrade): void {
    const trades = this.getTradesLocal();
    const existingIdx = trades.findIndex(t => t.id === trade.id);
    if (existingIdx !== -1) {
      trades[existingIdx] = trade;
    } else {
      trades.unshift(trade);
    }
    // Máximo 100 trades
    const trimmed = trades.slice(0, 100);
    localStorage.setItem('kucoin_eur_trade_history', JSON.stringify(trimmed));
  }

  getTradesLocal(): KuCoinTrade[] {
    try {
      const saved = localStorage.getItem('kucoin_eur_trade_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  async getTrades(): Promise<KuCoinTrade[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return this.getTradesLocal();
    }

    try {
      const { data, error } = await supabase
        .from(TRADES_TABLE)
        .select('*')
        .eq('user_id', this.userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[KuCoin Sync] Error cargando trades:', error);
        return this.getTradesLocal();
      }

      // Sincronizar con local
      if (data && data.length > 0) {
        const trades = data.map(t => ({
          id: t.id,
          pair: t.pair,
          side: t.side as 'BUY' | 'SELL',
          base_currency: t.base_currency,
          quote_currency: t.quote_currency,
          amount: t.amount,
          price: t.price,
          total: t.total,
          fee: t.fee,
          total_with_fee: t.total_with_fee,
          net_received: t.net_received,
          timestamp: t.timestamp,
          status: t.status,
          balance_after: t.balance_after
        }));
        localStorage.setItem('kucoin_eur_trade_history', JSON.stringify(trades));
        console.log('[KuCoin Sync] ✅ Trades sincronizados desde Supabase:', trades.length);
        return trades;
      }

      return this.getTradesLocal();
    } catch (err) {
      console.error('[KuCoin Sync] Error:', err);
      return this.getTradesLocal();
    }
  }

  // ========== BALANCES ==========

  async saveBalances(balances: KuCoinBalance[]): Promise<boolean> {
    // Siempre guardar en localStorage
    localStorage.setItem('kucoin_trading_accounts', JSON.stringify(balances));

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[KuCoin Sync] Balances guardados solo en LOCAL');
      return true;
    }

    try {
      const records = balances.map(b => ({
        id: b.id,
        currency: b.currency,
        type: b.type,
        balance: b.balance,
        available: b.available,
        holds: b.holds || '0',
        user_id: this.userId,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from(BALANCES_TABLE)
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error('[KuCoin Sync] Error guardando balances:', error);
        return false;
      }

      console.log('[KuCoin Sync] ✅ Balances sincronizados:', balances.length);
      this.notifyBalanceListeners(balances);
      return true;
    } catch (err) {
      console.error('[KuCoin Sync] Error:', err);
      return false;
    }
  }

  getBalancesLocal(): KuCoinBalance[] {
    try {
      const saved = localStorage.getItem('kucoin_trading_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  async getBalances(): Promise<KuCoinBalance[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return this.getBalancesLocal();
    }

    try {
      const { data, error } = await supabase
        .from(BALANCES_TABLE)
        .select('*')
        .eq('user_id', this.userId)
        .eq('type', 'trade');

      if (error) {
        console.error('[KuCoin Sync] Error cargando balances:', error);
        return this.getBalancesLocal();
      }

      if (data && data.length > 0) {
        const balances = data.map(b => ({
          id: b.id,
          currency: b.currency,
          type: b.type as 'main' | 'trade',
          balance: b.balance,
          available: b.available,
          holds: b.holds
        }));
        
        // Merge con local (priorizar valores más recientes)
        const localBalances = this.getBalancesLocal();
        const merged = this.mergeBalances(localBalances, balances);
        
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(merged));
        console.log('[KuCoin Sync] ✅ Balances sincronizados desde Supabase:', merged.length);
        return merged;
      }

      return this.getBalancesLocal();
    } catch (err) {
      console.error('[KuCoin Sync] Error:', err);
      return this.getBalancesLocal();
    }
  }

  private mergeBalances(local: KuCoinBalance[], remote: KuCoinBalance[]): KuCoinBalance[] {
    const merged = [...local];
    
    remote.forEach(remoteBalance => {
      const localIdx = merged.findIndex(l => l.currency === remoteBalance.currency && l.type === remoteBalance.type);
      if (localIdx === -1) {
        merged.push(remoteBalance);
      } else {
        // Si el balance local tiene valores, mantenerlo (más reciente)
        const localBalance = parseFloat(merged[localIdx].available);
        const remoteBalanceValue = parseFloat(remoteBalance.available);
        if (localBalance === 0 && remoteBalanceValue > 0) {
          merged[localIdx] = remoteBalance;
        }
      }
    });

    return merged;
  }

  // ========== LOAD HISTORY ==========

  async saveLoadHistory(load: KuCoinLoadHistory): Promise<boolean> {
    // Guardar en localStorage
    const loads = this.getLoadsLocal();
    loads.unshift(load);
    localStorage.setItem('kucoin_eur_load_history', JSON.stringify(loads.slice(0, 50)));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return true;
    }

    try {
      const { error } = await supabase
        .from(LOADS_TABLE)
        .insert({
          id: load.id,
          type: load.type,
          from_account: load.from,
          from_id: load.from_id,
          to_account: load.to,
          amount: load.amount,
          currency: load.currency,
          timestamp: load.timestamp,
          balance_after: load.balance_after,
          user_id: this.userId
        });

      if (error) {
        console.error('[KuCoin Sync] Error guardando carga:', error);
        return false;
      }

      console.log('[KuCoin Sync] ✅ Carga sincronizada:', load.id);
      return true;
    } catch (err) {
      console.error('[KuCoin Sync] Error:', err);
      return false;
    }
  }

  getLoadsLocal(): KuCoinLoadHistory[] {
    try {
      const saved = localStorage.getItem('kucoin_eur_load_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // ========== LISTENERS ==========

  subscribeToTrades(listener: TradeListener): () => void {
    this.tradeListeners.push(listener);
    return () => {
      this.tradeListeners = this.tradeListeners.filter(l => l !== listener);
    };
  }

  subscribeToBalances(listener: BalanceListener): () => void {
    this.balanceListeners.push(listener);
    return () => {
      this.balanceListeners = this.balanceListeners.filter(l => l !== listener);
    };
  }

  private notifyTradeListeners(trades: KuCoinTrade[]): void {
    this.tradeListeners.forEach(l => l(trades));
  }

  private notifyBalanceListeners(balances: KuCoinBalance[]): void {
    this.balanceListeners.forEach(l => l(balances));
  }

  // ========== SYNC ALL ==========

  async syncAll(): Promise<{ trades: number; balances: number }> {
    console.log('[KuCoin Sync] 🔄 Iniciando sincronización completa...');
    
    const trades = await this.getTrades();
    const balances = await this.getBalances();

    console.log('[KuCoin Sync] ✅ Sincronización completa:', {
      trades: trades.length,
      balances: balances.length
    });

    return {
      trades: trades.length,
      balances: balances.length
    };
  }

  // ========== STATUS ==========

  getStatus(): { online: boolean; userId: string } {
    return {
      online: this.isOnline,
      userId: this.userId
    };
  }

  setUserId(userId: string): void {
    this.userId = userId;
    console.log('[KuCoin Sync] Usuario establecido:', userId);
  }
}

// Singleton
export const kucoinSyncStore = new KuCoinSyncStore();



















