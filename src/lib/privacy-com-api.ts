/**
 * Privacy.com API Integration
 * Tarjetas Virtuales REALES que funcionan para compras online
 * 
 * https://privacy.com/developer
 * 
 * Privacy.com permite crear tarjetas virtuales Visa que funcionan
 * inmediatamente para compras en internet.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface PrivacyConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
}

export interface PrivacyCard {
  token: string;
  memo: string;
  pan: string;           // Número de tarjeta completo
  cvv: string;           // CVV
  exp_month: string;     // Mes de expiración
  exp_year: string;      // Año de expiración
  hostname: string;      // Dominio autorizado (si aplica)
  last_four: string;     // Últimos 4 dígitos
  spend_limit: number;   // Límite de gasto
  spend_limit_duration: 'TRANSACTION' | 'MONTHLY' | 'ANNUALLY' | 'FOREVER';
  state: 'OPEN' | 'PAUSED' | 'CLOSED';
  type: 'SINGLE_USE' | 'MERCHANT_LOCKED' | 'UNLOCKED';
  created: string;
  funding: {
    token: string;
    type: string;
    state: string;
    account_name: string;
    last_four: string;
  };
}

export interface PrivacyTransaction {
  token: string;
  amount: number;
  authorization_amount: number;
  merchant: {
    acceptor_id: string;
    city: string;
    country: string;
    descriptor: string;
    mcc: string;
    state: string;
  };
  result: 'APPROVED' | 'DECLINED';
  settled_amount: number;
  status: 'PENDING' | 'VOIDED' | 'SETTLING' | 'SETTLED' | 'BOUNCED';
  created: string;
  card: {
    token: string;
    last_four: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏦 CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'privacy_com_config';
const CARDS_KEY = 'privacy_com_cards';

class PrivacyComService {
  private config: PrivacyConfig | null = null;
  private baseUrl: string = 'https://api.privacy.com/v1';
  private sandboxUrl: string = 'https://sandbox.privacy.com/v1';
  
  constructor() {
    this.loadConfig();
  }
  
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
        console.log('[Privacy.com] ✅ Configuración cargada');
      }
    } catch (e) {
      console.error('[Privacy.com] Error cargando config:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  
  configure(config: PrivacyConfig): void {
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log(`[Privacy.com] ✅ Configurado en modo ${config.environment}`);
  }
  
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }
  
  getConfig(): PrivacyConfig | null {
    return this.config;
  }
  
  private getApiUrl(): string {
    return this.config?.environment === 'production' ? this.baseUrl : this.sandboxUrl;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔗 API REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'API no configurada' };
    }
    
    const url = `${this.getApiUrl()}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `api-key ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      console.error('[Privacy.com] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error de conexión' 
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 💳 CREAR TARJETA VIRTUAL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Crear una tarjeta virtual nueva
   * 
   * @param type - Tipo de tarjeta:
   *   - SINGLE_USE: Un solo uso, se cierra después de la primera transacción
   *   - MERCHANT_LOCKED: Bloqueada al primer comercio que la use
   *   - UNLOCKED: Sin restricciones de comercio
   * @param memo - Descripción/nombre de la tarjeta
   * @param spendLimit - Límite de gasto en centavos (ej: 10000 = $100)
   * @param spendLimitDuration - Duración del límite
   */
  async createCard(options: {
    type: 'SINGLE_USE' | 'MERCHANT_LOCKED' | 'UNLOCKED';
    memo: string;
    spendLimit?: number;
    spendLimitDuration?: 'TRANSACTION' | 'MONTHLY' | 'ANNUALLY' | 'FOREVER';
  }): Promise<{ success: boolean; card?: PrivacyCard; error?: string }> {
    
    const body: Record<string, unknown> = {
      type: options.type,
      memo: options.memo,
    };
    
    if (options.spendLimit) {
      body.spend_limit = options.spendLimit;
      body.spend_limit_duration = options.spendLimitDuration || 'TRANSACTION';
    }
    
    const result = await this.apiRequest<PrivacyCard>('/card', 'POST', body);
    
    if (result.success && result.data) {
      // Guardar tarjeta localmente
      this.saveCard(result.data);
      console.log(`[Privacy.com] ✅ Tarjeta creada: **** ${result.data.last_four}`);
    }
    
    return {
      success: result.success,
      card: result.data,
      error: result.error,
    };
  }
  
  /**
   * Crear tarjeta de un solo uso (más segura para compras únicas)
   */
  async createSingleUseCard(memo: string, amountCents: number): Promise<{ success: boolean; card?: PrivacyCard; error?: string }> {
    return this.createCard({
      type: 'SINGLE_USE',
      memo,
      spendLimit: amountCents,
      spendLimitDuration: 'TRANSACTION',
    });
  }
  
  /**
   * Crear tarjeta para un comercio específico (ej: Netflix, Amazon)
   */
  async createMerchantCard(memo: string, monthlyLimitCents: number): Promise<{ success: boolean; card?: PrivacyCard; error?: string }> {
    return this.createCard({
      type: 'MERCHANT_LOCKED',
      memo,
      spendLimit: monthlyLimitCents,
      spendLimitDuration: 'MONTHLY',
    });
  }
  
  /**
   * Crear tarjeta sin restricciones
   */
  async createUnlockedCard(memo: string, limitCents?: number): Promise<{ success: boolean; card?: PrivacyCard; error?: string }> {
    return this.createCard({
      type: 'UNLOCKED',
      memo,
      spendLimit: limitCents,
      spendLimitDuration: limitCents ? 'MONTHLY' : undefined,
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📋 GESTIÓN DE TARJETAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener todas las tarjetas
   */
  async getCards(): Promise<PrivacyCard[]> {
    const result = await this.apiRequest<{ data: PrivacyCard[] }>('/card');
    return result.data?.data || [];
  }
  
  /**
   * Obtener una tarjeta específica
   */
  async getCard(cardToken: string): Promise<PrivacyCard | null> {
    const result = await this.apiRequest<PrivacyCard>(`/card/${cardToken}`);
    return result.data || null;
  }
  
  /**
   * Actualizar tarjeta (pausar, cerrar, cambiar límite)
   */
  async updateCard(cardToken: string, updates: {
    state?: 'OPEN' | 'PAUSED' | 'CLOSED';
    memo?: string;
    spend_limit?: number;
    spend_limit_duration?: 'TRANSACTION' | 'MONTHLY' | 'ANNUALLY' | 'FOREVER';
  }): Promise<{ success: boolean; card?: PrivacyCard; error?: string }> {
    const result = await this.apiRequest<PrivacyCard>(`/card/${cardToken}`, 'PUT', updates);
    
    if (result.success && result.data) {
      this.saveCard(result.data);
    }
    
    return {
      success: result.success,
      card: result.data,
      error: result.error,
    };
  }
  
  /**
   * Pausar tarjeta (puede reactivarse)
   */
  async pauseCard(cardToken: string): Promise<boolean> {
    const result = await this.updateCard(cardToken, { state: 'PAUSED' });
    return result.success;
  }
  
  /**
   * Reactivar tarjeta pausada
   */
  async resumeCard(cardToken: string): Promise<boolean> {
    const result = await this.updateCard(cardToken, { state: 'OPEN' });
    return result.success;
  }
  
  /**
   * Cerrar tarjeta permanentemente
   */
  async closeCard(cardToken: string): Promise<boolean> {
    const result = await this.updateCard(cardToken, { state: 'CLOSED' });
    return result.success;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 TRANSACCIONES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener transacciones
   */
  async getTransactions(options?: {
    cardToken?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PrivacyTransaction[]> {
    let endpoint = '/transaction';
    const params = new URLSearchParams();
    
    if (options?.cardToken) params.set('card_token', options.cardToken);
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('page_size', options.pageSize.toString());
    
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    const result = await this.apiRequest<{ data: PrivacyTransaction[] }>(endpoint);
    return result.data?.data || [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 💾 ALMACENAMIENTO LOCAL
  // ═══════════════════════════════════════════════════════════════════════════
  
  private saveCard(card: PrivacyCard): void {
    const cards = this.getLocalCards();
    const index = cards.findIndex(c => c.token === card.token);
    
    if (index >= 0) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  }
  
  getLocalCards(): PrivacyCard[] {
    try {
      const stored = localStorage.getItem(CARDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Probar conexión con la API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: 'API no configurada' };
    }
    
    try {
      const cards = await this.getCards();
      return { 
        success: true, 
        message: `Conexión exitosa. ${cards.length} tarjetas encontradas.` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error de conexión' 
      };
    }
  }
}

// Singleton
export const privacyComService = new PrivacyComService();

export default privacyComService;

