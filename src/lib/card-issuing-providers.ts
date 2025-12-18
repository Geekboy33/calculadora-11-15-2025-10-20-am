/**
 * Card Issuing Providers - Emisión de Tarjetas REALES Online
 * 
 * Integración con proveedores de emisión de tarjetas que permiten
 * crear tarjetas virtuales funcionales para compras online.
 * 
 * Proveedores soportados:
 * - Stripe Issuing (Visa)
 * - Marqeta (Visa/Mastercard)
 * - Lithic (Visa)
 * - Privacy.com (Visa)
 */

import { VirtualCard } from './cards-store';
import { CustodyAccount } from './custody-store';

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 CONFIGURACIÓN DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════

export interface CardIssuerConfig {
  provider: 'stripe' | 'marqeta' | 'lithic' | 'privacy';
  apiKey: string;
  secretKey?: string;
  environment: 'sandbox' | 'production';
  webhookSecret?: string;
}

export interface IssuedCard {
  id: string;
  providerId: string; // ID en el proveedor
  provider: string;
  cardNumber: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholderName: string;
  brand: string;
  type: 'virtual' | 'physical';
  currency: string;
  spendingLimit: number;
  status: 'active' | 'inactive' | 'canceled';
  createdAt: string;
  metadata: Record<string, string>;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  merchant: string;
  merchantCategory: string;
  status: 'pending' | 'completed' | 'declined';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💳 STRIPE ISSUING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stripe Issuing - Emite tarjetas Visa reales
 * https://stripe.com/docs/issuing
 * 
 * Requisitos:
 * - Cuenta Stripe con Issuing habilitado
 * - API Key (sk_live_xxx o sk_test_xxx)
 * - Fondos en Issuing Balance
 */
export class StripeIssuingProvider {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: { apiKey: string; environment: 'sandbox' | 'production' }) {
    this.apiKey = config.apiKey;
    this.baseUrl = 'https://api.stripe.com/v1';
  }
  
  /**
   * Crear titular de tarjeta (Cardholder)
   */
  async createCardholder(data: {
    name: string;
    email: string;
    phone?: string;
    billing: {
      address: {
        line1: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    };
  }): Promise<{ id: string; name: string; email: string }> {
    const response = await fetch(`${this.baseUrl}/issuing/cardholders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'name': data.name,
        'email': data.email,
        'phone_number': data.phone || '',
        'type': 'individual',
        'billing[address][line1]': data.billing.address.line1,
        'billing[address][city]': data.billing.address.city,
        'billing[address][state]': data.billing.address.state,
        'billing[address][postal_code]': data.billing.address.postal_code,
        'billing[address][country]': data.billing.address.country,
      }).toString(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
    
    return response.json();
  }
  
  /**
   * Crear tarjeta virtual
   */
  async createCard(data: {
    cardholderId: string;
    currency: string;
    spendingLimit?: number;
    metadata?: Record<string, string>;
  }): Promise<IssuedCard> {
    const params: Record<string, string> = {
      'cardholder': data.cardholderId,
      'currency': data.currency.toLowerCase(),
      'type': 'virtual',
      'status': 'active',
    };
    
    if (data.spendingLimit) {
      params['spending_controls[spending_limits][0][amount]'] = data.spendingLimit.toString();
      params['spending_controls[spending_limits][0][interval]'] = 'all_time';
    }
    
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        params[`metadata[${key}]`] = value;
      });
    }
    
    const response = await fetch(`${this.baseUrl}/issuing/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const card = await response.json();
    
    return {
      id: card.id,
      providerId: card.id,
      provider: 'stripe',
      cardNumber: card.number || '',
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      cvc: card.cvc || '',
      cardholderName: card.cardholder?.name || '',
      brand: card.brand,
      type: card.type,
      currency: card.currency.toUpperCase(),
      spendingLimit: card.spending_controls?.spending_limits?.[0]?.amount || 0,
      status: card.status,
      createdAt: new Date(card.created * 1000).toISOString(),
      metadata: card.metadata || {},
    };
  }
  
  /**
   * Obtener datos sensibles de la tarjeta (número completo, CVV)
   * Requiere expansión especial
   */
  async getCardDetails(cardId: string): Promise<{ number: string; cvc: string }> {
    const response = await fetch(
      `${this.baseUrl}/issuing/cards/${cardId}?expand[]=number&expand[]=cvc`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const card = await response.json();
    return {
      number: card.number,
      cvc: card.cvc,
    };
  }
  
  /**
   * Actualizar estado de tarjeta
   */
  async updateCardStatus(cardId: string, status: 'active' | 'inactive' | 'canceled'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/issuing/cards/${cardId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ status }).toString(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Listar transacciones de una tarjeta
   */
  async listTransactions(cardId: string): Promise<CardTransaction[]> {
    const response = await fetch(
      `${this.baseUrl}/issuing/transactions?card=${cardId}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    return data.data.map((tx: any) => ({
      id: tx.id,
      cardId: tx.card,
      amount: tx.amount,
      currency: tx.currency.toUpperCase(),
      merchant: tx.merchant_data?.name || 'Unknown',
      merchantCategory: tx.merchant_data?.category || 'Unknown',
      status: tx.type === 'capture' ? 'completed' : 'pending',
      createdAt: new Date(tx.created * 1000).toISOString(),
    }));
  }
  
  /**
   * Obtener balance de Issuing
   */
  async getIssuingBalance(): Promise<{ available: number; pending: number; currency: string }[]> {
    const response = await fetch(`${this.baseUrl}/balance`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Filtrar solo balances de Issuing
    return data.issuing?.available?.map((b: any) => ({
      available: b.amount,
      pending: 0,
      currency: b.currency.toUpperCase(),
    })) || [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 💳 MARQETA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marqeta - Plataforma de emisión de tarjetas
 * https://www.marqeta.com/docs/core-api/
 * 
 * Requisitos:
 * - Cuenta Marqeta
 * - Application Token y Admin Access Token
 */
export class MarqetaProvider {
  private applicationToken: string;
  private adminToken: string;
  private baseUrl: string;
  
  constructor(config: { 
    applicationToken: string; 
    adminToken: string;
    environment: 'sandbox' | 'production';
  }) {
    this.applicationToken = config.applicationToken;
    this.adminToken = config.adminToken;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.marqeta.com/v3'
      : 'https://sandbox-api.marqeta.com/v3';
  }
  
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.applicationToken}:${this.adminToken}`).toString('base64');
    return `Basic ${credentials}`;
  }
  
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<{ token: string }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Marqeta Error: ${error.error_message || 'Unknown error'}`);
    }
    
    const user = await response.json();
    return { token: user.token };
  }
  
  async createCard(data: {
    userToken: string;
    cardProductToken: string;
  }): Promise<IssuedCard> {
    const response = await fetch(`${this.baseUrl}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_token: data.userToken,
        card_product_token: data.cardProductToken,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Marqeta Error: ${error.error_message || 'Unknown error'}`);
    }
    
    const card = await response.json();
    
    return {
      id: card.token,
      providerId: card.token,
      provider: 'marqeta',
      cardNumber: card.pan || '',
      last4: card.last_four,
      expMonth: parseInt(card.expiration?.substring(0, 2) || '0'),
      expYear: parseInt('20' + card.expiration?.substring(2, 4) || '0'),
      cvc: card.cvv_number || '',
      cardholderName: '',
      brand: card.card_product_token?.includes('visa') ? 'visa' : 'mastercard',
      type: 'virtual',
      currency: 'USD',
      spendingLimit: 0,
      status: card.state === 'ACTIVE' ? 'active' : 'inactive',
      createdAt: card.created_time,
      metadata: {},
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 💳 LITHIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lithic - API de emisión de tarjetas
 * https://docs.lithic.com/
 */
export class LithicProvider {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: { apiKey: string; environment: 'sandbox' | 'production' }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.lithic.com/v1'
      : 'https://sandbox.lithic.com/v1';
  }
  
  async createCard(data: {
    type: 'VIRTUAL' | 'PHYSICAL';
    spendLimit?: number;
    memo?: string;
  }): Promise<IssuedCard> {
    const response = await fetch(`${this.baseUrl}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: data.type,
        spend_limit: data.spendLimit,
        memo: data.memo,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Lithic Error: ${error.message || 'Unknown error'}`);
    }
    
    const card = await response.json();
    
    return {
      id: card.token,
      providerId: card.token,
      provider: 'lithic',
      cardNumber: card.pan || '',
      last4: card.last_four,
      expMonth: parseInt(card.exp_month),
      expYear: parseInt(card.exp_year),
      cvc: card.cvv || '',
      cardholderName: '',
      brand: 'visa',
      type: card.type.toLowerCase() as 'virtual' | 'physical',
      currency: 'USD',
      spendingLimit: card.spend_limit || 0,
      status: card.state === 'OPEN' ? 'active' : 'inactive',
      createdAt: card.created,
      metadata: {},
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY DE PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'daes_card_issuer_config';

export class CardIssuingService {
  private config: CardIssuerConfig | null = null;
  private stripeProvider: StripeIssuingProvider | null = null;
  private marqetaProvider: MarqetaProvider | null = null;
  private lithicProvider: LithicProvider | null = null;
  
  constructor() {
    this.loadConfig();
  }
  
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
        this.initializeProvider();
      }
    } catch (e) {
      console.error('[CardIssuing] Error loading config:', e);
    }
  }
  
  private initializeProvider(): void {
    if (!this.config) return;
    
    switch (this.config.provider) {
      case 'stripe':
        this.stripeProvider = new StripeIssuingProvider({
          apiKey: this.config.apiKey,
          environment: this.config.environment,
        });
        break;
      case 'marqeta':
        this.marqetaProvider = new MarqetaProvider({
          applicationToken: this.config.apiKey,
          adminToken: this.config.secretKey || '',
          environment: this.config.environment,
        });
        break;
      case 'lithic':
        this.lithicProvider = new LithicProvider({
          apiKey: this.config.apiKey,
          environment: this.config.environment,
        });
        break;
    }
  }
  
  /**
   * Configurar proveedor de emisión
   */
  configure(config: CardIssuerConfig): void {
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    this.initializeProvider();
    console.log(`[CardIssuing] ✅ Configurado proveedor: ${config.provider} (${config.environment})`);
  }
  
  /**
   * Verificar si está configurado
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
  
  /**
   * Obtener configuración actual
   */
  getConfig(): CardIssuerConfig | null {
    return this.config;
  }
  
  /**
   * Emitir tarjeta real
   */
  async issueRealCard(
    custodyAccount: CustodyAccount,
    cardholderName: string,
    options: {
      spendingLimit?: number;
      email?: string;
      billingAddress?: {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    } = {}
  ): Promise<IssuedCard> {
    if (!this.config) {
      throw new Error('Card issuing provider not configured');
    }
    
    switch (this.config.provider) {
      case 'stripe':
        if (!this.stripeProvider) throw new Error('Stripe not initialized');
        
        // 1. Crear cardholder
        const cardholder = await this.stripeProvider.createCardholder({
          name: cardholderName,
          email: options.email || 'cardholder@daes.bank',
          billing: {
            address: options.billingAddress || {
              line1: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94111',
              country: 'US',
            },
          },
        });
        
        // 2. Crear tarjeta
        const stripeCard = await this.stripeProvider.createCard({
          cardholderId: cardholder.id,
          currency: custodyAccount.currency,
          spendingLimit: options.spendingLimit || custodyAccount.availableBalance,
          metadata: {
            custody_account_id: custodyAccount.id,
            custody_account_name: custodyAccount.accountName,
          },
        });
        
        // 3. Obtener datos completos
        const details = await this.stripeProvider.getCardDetails(stripeCard.id);
        stripeCard.cardNumber = details.number;
        stripeCard.cvc = details.cvc;
        
        return stripeCard;
        
      case 'lithic':
        if (!this.lithicProvider) throw new Error('Lithic not initialized');
        
        return this.lithicProvider.createCard({
          type: 'VIRTUAL',
          spendLimit: options.spendingLimit || custodyAccount.availableBalance,
          memo: `DAES Custody: ${custodyAccount.accountName}`,
        });
        
      default:
        throw new Error(`Provider ${this.config.provider} not fully implemented`);
    }
  }
  
  /**
   * Obtener transacciones
   */
  async getTransactions(cardId: string): Promise<CardTransaction[]> {
    if (!this.config) throw new Error('Not configured');
    
    if (this.config.provider === 'stripe' && this.stripeProvider) {
      return this.stripeProvider.listTransactions(cardId);
    }
    
    return [];
  }
  
  /**
   * Actualizar estado de tarjeta
   */
  async updateCardStatus(cardId: string, status: 'active' | 'inactive' | 'canceled'): Promise<void> {
    if (!this.config) throw new Error('Not configured');
    
    if (this.config.provider === 'stripe' && this.stripeProvider) {
      await this.stripeProvider.updateCardStatus(cardId, status);
    }
  }
  
  /**
   * Obtener balance disponible
   */
  async getBalance(): Promise<{ available: number; currency: string }[]> {
    if (!this.config) throw new Error('Not configured');
    
    if (this.config.provider === 'stripe' && this.stripeProvider) {
      return this.stripeProvider.getIssuingBalance();
    }
    
    return [];
  }
}

// Singleton
export const cardIssuingService = new CardIssuingService();

// ═══════════════════════════════════════════════════════════════════════════
// 📋 LISTA DE PROVEEDORES DISPONIBLES
// ═══════════════════════════════════════════════════════════════════════════

export const AVAILABLE_PROVIDERS = [
  {
    id: 'stripe',
    name: 'Stripe Issuing',
    logo: '💳',
    description: 'Emite tarjetas Visa virtuales y físicas',
    website: 'https://stripe.com/issuing',
    networks: ['visa'],
    features: ['Virtual cards', 'Physical cards', 'Spending controls', 'Real-time auth'],
    requirements: ['Stripe account', 'Issuing enabled', 'KYC verified'],
    pricing: '1% + $0.10 per transaction',
  },
  {
    id: 'marqeta',
    name: 'Marqeta',
    logo: '🏦',
    description: 'Plataforma empresarial de emisión de tarjetas',
    website: 'https://www.marqeta.com',
    networks: ['visa', 'mastercard'],
    features: ['Virtual cards', 'Physical cards', 'JIT Funding', 'Webhooks'],
    requirements: ['Enterprise account', 'Program approval'],
    pricing: 'Custom pricing',
  },
  {
    id: 'lithic',
    name: 'Lithic',
    logo: '⚡',
    description: 'API moderna de emisión de tarjetas',
    website: 'https://lithic.com',
    networks: ['visa'],
    features: ['Virtual cards', 'Physical cards', 'Spend controls', 'Sandbox'],
    requirements: ['API key', 'Account approval'],
    pricing: '$0.10 per card/month + transaction fees',
  },
  {
    id: 'privacy',
    name: 'Privacy.com',
    logo: '🔒',
    description: 'Tarjetas virtuales para privacidad',
    website: 'https://privacy.com',
    networks: ['visa'],
    features: ['Virtual cards', 'Merchant locking', 'Spending limits'],
    requirements: ['US bank account', 'Identity verification'],
    pricing: 'Free tier available',
  },
];

