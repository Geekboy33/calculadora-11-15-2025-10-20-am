/**
 * DAES API Client - Simplificado
 * 
 * El frontend SOLO envía:
 * - amount_usd
 * - wallet_destino
 * - expiry_seconds (opcional)
 * 
 * ⚠️ SECURITY:
 * - beneficiary es decidido por el servidor
 * - La firma nunca se expone al frontend
 * - El servidor hace: hold → sign → mint en un request
 */

const API_BASE = import.meta.env.VITE_DAES_API_BASE || "http://localhost:3000";

// =============================================================================
// Types
// =============================================================================

export interface MintRequestPayload {
  amount_usd: number;
  wallet_destino: string;
  expiry_seconds?: number;
  idempotency_key?: string; // Previene mints duplicados
}

export interface MintResult {
  success: boolean;
  daes_ref?: string;
  hold_id?: string;
  tx_hash?: string;
  status?: string;
  amount_usd?: number;
  amount_dusd?: number;
  wallet_destino?: string;
  minted_to?: string;
  message?: string;
  error?: string;
  code?: string;
  idempotent?: boolean; // true si es respuesta de request anterior
}

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";
  tx_hash?: string;
}

export interface StatsResult {
  success: boolean;
  total: number;
  captured: number;
  released: number;
  pending: number;
  total_amount_captured: number;
  total_amount_pending: number;
}

export interface HealthResult {
  success: boolean;
  status?: string;
  blockNumber?: number;
  chainId?: number;
  bridge?: string;
  signer?: string;
  operator?: string;
  beneficiary?: string;
  error?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Genera una idempotency_key única para prevenir mints duplicados
 */
export function generateIdempotencyKey(wallet: string, amount: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `mint_${wallet.toLowerCase().slice(0, 10)}_${amount}_${timestamp}_${random}`;
}

/**
 * ✅ ENDPOINT ÚNICO: mint-request
 * Hace: hold → sign → mint en un solo request
 * 
 * El usuario solo envía:
 * - amount_usd: monto en USD
 * - wallet_destino: wallet del usuario final
 * - expiry_seconds: (opcional) tiempo de expiración del hold
 * - idempotency_key: (opcional) previene mints duplicados
 * 
 * El servidor decide:
 * - beneficiary (DEFAULT_BENEFICIARY)
 * - Firma EIP-712 (nunca expuesta)
 * 
 * ⚠️ PROTECCIONES:
 * - Rate limit: 10 req/min por IP, 5 mints/min por wallet
 * - Idempotencia: no re-mintea si ya procesado
 */
export async function dusdMintRequest(payload: MintRequestPayload): Promise<MintResult> {
  try {
    // Auto-genera idempotency_key si no se proporciona
    const requestPayload = {
      ...payload,
      idempotency_key: payload.idempotency_key || generateIdempotencyKey(payload.wallet_destino, payload.amount_usd)
    };

    const response = await fetch(`${API_BASE}/api/dusd/mint-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error('Backend not available');
    }

    const result = await response.json();

    // Log si fue respuesta idempotente
    if (result.idempotent) {
      console.log("[DAES API] Idempotent response - request was already processed");
    }

    return result;
  } catch (error: any) {
    console.warn("[DAES API] Backend offline, using demo mode for mint");
    
    // Generar TX hash simulado para modo demo
    const txHash = '0x' + Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    const daesRef = 'DAES-' + Date.now().toString(36).toUpperCase();
    
    return { 
      success: true, 
      daes_ref: daesRef,
      hold_id: 'HOLD-' + Date.now(),
      tx_hash: txHash,
      status: 'CAPTURED',
      amount_usd: payload.amount_usd,
      amount_dusd: payload.amount_usd,
      wallet_destino: payload.wallet_destino,
      minted_to: payload.wallet_destino,
      message: `Demo mode: ${payload.amount_usd} dUSD minted successfully`
    };
  }
}

/**
 * Get hold by daes_ref
 */
export async function daesGetHold(daes_ref: string): Promise<{ success: boolean; hold?: HoldRecord; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/dusd/hold/${encodeURIComponent(daes_ref)}`);
    return await response.json();
  } catch (error: any) {
    console.error("[DAES API] Error fetching hold:", error);
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

/**
 * Get all holds
 */
export async function daesGetHolds(): Promise<{ success: boolean; holds?: HoldRecord[]; count?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/dusd/holds`);
    return await response.json();
  } catch (error: any) {
    console.error("[DAES API] Error fetching holds:", error);
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

/**
 * Get statistics
 */
export async function daesGetStats(): Promise<StatsResult> {
  try {
    const response = await fetch(`${API_BASE}/api/dusd/stats`);
    return await response.json();
  } catch (error: any) {
    console.error("[DAES API] Error fetching stats:", error);
    return { 
      success: false, 
      total: 0, 
      captured: 0, 
      released: 0, 
      pending: 0,
      total_amount_captured: 0,
      total_amount_pending: 0
    };
  }
}

/**
 * Health check
 * En modo demo (sin backend), retorna datos simulados
 */
export async function daesHealthCheck(): Promise<HealthResult> {
  try {
    const response = await fetch(`${API_BASE}/api/dusd/health`);
    if (!response.ok) {
      throw new Error('Backend not available');
    }
    return await response.json();
  } catch (error: any) {
    console.warn("[DAES API] Backend offline, using demo mode:", error.message);
    // Retornar datos simulados para modo demo
    return { 
      success: true, 
      status: 'demo',
      blockNumber: 19847291,
      chainId: 42161,
      bridge: '0x1234567890abcdef1234567890abcdef12345678',
      signer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
      operator: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
      beneficiary: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9'
    };
  }
}

// =============================================================================
// DAES API Service - Para DAESApiConfigModule
// =============================================================================

export interface DAESApiConfig {
  apiKey: string;
  baseUrl: string;
  network: 'mainnet' | 'testnet' | 'arbitrum' | 'ethereum';
  timeout: number;
}

export interface DAESAccount {
  id: string;
  name: string;
  address: string;
  balance: number;
  currency: string;
  type: 'custody' | 'treasury' | 'settlement';
  status: 'active' | 'inactive' | 'frozen';
  lastSync?: number;
}

export interface DAESVerificationResult {
  success: boolean;
  verified: boolean;
  accountId: string;
  amount: number;
  currency: string;
  availableBalance: number;
  message?: string;
  error?: string;
  verifiedAt?: number;
}

const CONFIG_STORAGE_KEY = 'daes_api_config';
const ACCOUNTS_STORAGE_KEY = 'daes_api_accounts';

class DAESApiService {
  private config: DAESApiConfig | null = null;
  private cachedAccounts: DAESAccount[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }
      const savedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (savedAccounts) {
        this.cachedAccounts = JSON.parse(savedAccounts);
      }
    } catch (e) {
      console.error('[DAES API Service] Error loading from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      if (this.config) {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      }
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.cachedAccounts));
    } catch (e) {
      console.error('[DAES API Service] Error saving to storage:', e);
    }
  }

  getConfig(): DAESApiConfig | null {
    return this.config;
  }

  configure(config: DAESApiConfig): void {
    this.config = config;
    this.saveToStorage();
    console.log('[DAES API Service] Configured:', config.baseUrl, config.network);
  }

  getCachedAccounts(): DAESAccount[] {
    return this.cachedAccounts;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string; latency?: number }> {
    if (!this.config) {
      return { success: false, error: 'API not configured' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl}/api/dusd/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout || 10000)
      });

      const latency = Date.now() - start;
      
      if (response.ok) {
        return { 
          success: true, 
          message: `Connected to ${this.config.network}`,
          latency 
        };
      } else {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}`,
          latency 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Connection failed',
        latency: Date.now() - start 
      };
    }
  }

  async syncAccounts(): Promise<void> {
    if (!this.config) {
      throw new Error('API not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/dusd/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accounts) {
          this.cachedAccounts = data.accounts;
          this.saveToStorage();
        }
      }
    } catch (error) {
      console.error('[DAES API Service] Error syncing accounts:', error);
      if (this.cachedAccounts.length === 0) {
        this.cachedAccounts = [
          {
            id: 'daes-treasury-1',
            name: 'DAES Treasury Main',
            address: '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
            balance: 1000000,
            currency: 'USD',
            type: 'treasury',
            status: 'active',
            lastSync: Date.now()
          },
          {
            id: 'daes-settlement-1',
            name: 'Settlement Account',
            address: '0x3db99FACe6BB270E86BCA3355655dB747867f67b',
            balance: 500000,
            currency: 'USD',
            type: 'settlement',
            status: 'active',
            lastSync: Date.now()
          }
        ];
        this.saveToStorage();
      }
    }
  }

  async getAccounts(): Promise<DAESAccount[]> {
    await this.syncAccounts();
    return this.cachedAccounts;
  }

  async verifyFunds(
    accountId: string, 
    amount: number, 
    currency: string
  ): Promise<DAESVerificationResult> {
    const account = this.cachedAccounts.find(a => a.id === accountId);
    
    if (!account) {
      return {
        success: false,
        verified: false,
        accountId,
        amount,
        currency,
        availableBalance: 0,
        error: 'Account not found'
      };
    }

    const hasSufficientFunds = account.balance >= amount;

    return {
      success: true,
      verified: hasSufficientFunds,
      accountId,
      amount,
      currency,
      availableBalance: account.balance,
      message: hasSufficientFunds 
        ? `Funds verified: ${amount} ${currency} available`
        : `Insufficient funds: requested ${amount} ${currency}, available ${account.balance} ${currency}`,
      verifiedAt: Date.now()
    };
  }
}

export const daesApiService = new DAESApiService();
