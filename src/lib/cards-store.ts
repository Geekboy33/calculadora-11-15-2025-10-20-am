/**
 * Cards Store - Sistema de Emisión de Tarjetas Virtuales
 * Protocolo de Tarjetas compatible con ISO 7812 / Visa / Mastercard
 * 
 * IMPORTANTE: Este sistema es para DEMOSTRACIÓN y TESTING
 * Para producción real se requiere:
 * - Licencia de emisor de tarjetas
 * - Certificación PCI-DSS
 * - Integración con procesador de pagos (Visa Direct, Mastercard Send, etc.)
 */

import CryptoJS from 'crypto-js';
import { custodyStore, CustodyAccount } from './custody-store';

// ═══════════════════════════════════════════════════════════════════════════
// 🎴 INTERFACES Y TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface VirtualCard {
  id: string;
  cardNumber: string; // PAN (Primary Account Number)
  cardNumberMasked: string; // **** **** **** 1234
  expiryMonth: string; // MM
  expiryYear: string; // YYYY
  cvv: string; // CVV/CVC (encriptado)
  cardholderName: string;
  
  // Tipo y Red
  cardType: 'virtual' | 'physical';
  cardNetwork: 'visa' | 'mastercard' | 'amex' | 'unionpay';
  cardCategory: 'debit' | 'credit' | 'prepaid';
  cardTier: 'classic' | 'gold' | 'platinum' | 'black' | 'infinite';
  
  // Vinculación a Cuenta Custodio
  custodyAccountId: string;
  custodyAccountName: string;
  currency: string;
  
  // Límites
  spendingLimit: number;
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  
  // Balances
  availableBalance: number;
  currentBalance: number;
  
  // Estado
  status: 'active' | 'inactive' | 'frozen' | 'expired' | 'cancelled';
  activatedAt?: string;
  
  // Seguridad
  pin?: string; // PIN encriptado (para cajeros)
  pinSet: boolean;
  threeDSecure: boolean;
  contactless: boolean;
  
  // Metadata
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Timestamps
  createdAt: string;
  lastUsed?: string;
  expiresAt: string;
  
  // Transacciones
  totalSpent: number;
  transactionCount: number;
  
  // Compliance
  kycVerified: boolean;
  amlCleared: boolean;
  
  // Token para API
  cardToken: string;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  type: 'purchase' | 'refund' | 'withdrawal' | 'transfer' | 'fee';
  amount: number;
  currency: string;
  merchant?: string;
  merchantCategory?: string;
  status: 'pending' | 'completed' | 'declined' | 'reversed';
  declineReason?: string;
  timestamp: string;
  reference: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔢 BIN (Bank Identification Number) - Primeros 6-8 dígitos
// ═══════════════════════════════════════════════════════════════════════════

const CARD_BINS = {
  visa: {
    classic: '411111', // Visa Classic Demo
    gold: '422222',
    platinum: '433333',
    infinite: '445544',
    business: '455555',
  },
  mastercard: {
    classic: '520000',
    gold: '530000',
    platinum: '540000',
    world: '550000',
    business: '510000',
  },
  amex: {
    classic: '371111',
    gold: '377711',
    platinum: '378282',
  },
  unionpay: {
    classic: '620000',
    platinum: '625000',
  }
};

// Nombres de BIN del banco
const DAES_ISSUER_BIN = '456789'; // BIN ficticio para DAES Bank

const STORAGE_KEY = 'daes_virtual_cards';
const TRANSACTIONS_KEY = 'daes_card_transactions';
const ENCRYPTION_KEY = 'DAES-CARDS-2024-SECURE';

// ═══════════════════════════════════════════════════════════════════════════
// 🎴 CLASE PRINCIPAL: CardsStore
// ═══════════════════════════════════════════════════════════════════════════

class CardsStore {
  private listeners: Set<(cards: VirtualCard[]) => void> = new Set();

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 ALGORITMO DE LUHN (Validación ISO 7812)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generar dígito de control usando algoritmo de Luhn
   * Este es el algoritmo estándar usado por Visa, Mastercard, etc.
   */
  private generateLuhnCheckDigit(partialNumber: string): string {
    const digits = partialNumber.split('').reverse().map(Number);
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (i % 2 === 0) { // Posiciones pares (desde el final)
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Validar número de tarjeta con algoritmo de Luhn
   */
  validateCardNumber(cardNumber: string): boolean {
    const cleanNumber = cardNumber.replace(/\s|-/g, '');
    if (!/^\d{13,19}$/.test(cleanNumber)) return false;
    
    const digits = cleanNumber.split('').reverse().map(Number);
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (i % 2 === 1) { // Posiciones impares (desde el final, excluyendo check digit)
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    return sum % 10 === 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔢 GENERACIÓN DE NÚMEROS DE TARJETA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generar número de tarjeta válido según ISO 7812
   */
  private generateCardNumber(network: 'visa' | 'mastercard' | 'amex' | 'unionpay', tier: string): string {
    // Obtener BIN según red y tier
    const bins = CARD_BINS[network] as Record<string, string>;
    const bin = bins[tier] || bins['classic'] || DAES_ISSUER_BIN;
    
    // Longitud del PAN
    let length = 16;
    if (network === 'amex') length = 15;
    
    // Generar dígitos aleatorios para el cuerpo
    const bodyLength = length - bin.length - 1; // -1 para el check digit
    let body = '';
    for (let i = 0; i < bodyLength; i++) {
      body += Math.floor(Math.random() * 10).toString();
    }
    
    // Número parcial sin check digit
    const partialNumber = bin + body;
    
    // Calcular check digit con Luhn
    const checkDigit = this.generateLuhnCheckDigit(partialNumber);
    
    const fullNumber = partialNumber + checkDigit;
    
    // Validar que el número sea correcto
    if (!this.validateCardNumber(fullNumber)) {
      console.error('[CardsStore] ❌ Error en generación de número de tarjeta');
      // Reintentar
      return this.generateCardNumber(network, tier);
    }
    
    console.log('[CardsStore] ✅ Número de tarjeta generado (Luhn válido)');
    return fullNumber;
  }

  /**
   * Generar CVV/CVC
   */
  private generateCVV(network: 'visa' | 'mastercard' | 'amex' | 'unionpay'): string {
    const length = network === 'amex' ? 4 : 3;
    let cvv = '';
    for (let i = 0; i < length; i++) {
      cvv += Math.floor(Math.random() * 10).toString();
    }
    return cvv;
  }

  /**
   * Generar fecha de expiración (3-5 años desde ahora)
   */
  private generateExpiry(): { month: string; year: string; expiresAt: string } {
    const now = new Date();
    const yearsToAdd = Math.floor(Math.random() * 3) + 3; // 3-5 años
    const expiryDate = new Date(now.getFullYear() + yearsToAdd, now.getMonth(), 1);
    
    return {
      month: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      year: expiryDate.getFullYear().toString(),
      expiresAt: expiryDate.toISOString(),
    };
  }

  /**
   * Enmascarar número de tarjeta
   */
  private maskCardNumber(cardNumber: string): string {
    const last4 = cardNumber.slice(-4);
    const length = cardNumber.length;
    const masked = '*'.repeat(length - 4);
    
    // Formatear con espacios
    const formatted = (masked + last4).match(/.{1,4}/g)?.join(' ') || cardNumber;
    return formatted;
  }

  /**
   * Encriptar datos sensibles
   */
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  /**
   * Desencriptar datos
   */
  private decrypt(encrypted: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  }

  /**
   * Generar token único para API
   */
  private generateCardToken(): string {
    return `card_${Date.now().toString(36)}_${CryptoJS.SHA256(Math.random().toString()).toString().substring(0, 24)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎴 EMISIÓN DE TARJETAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Emitir nueva tarjeta virtual vinculada a cuenta custodio
   */
  issueCard(
    custodyAccountId: string,
    cardholderName: string,
    options: {
      network?: 'visa' | 'mastercard' | 'amex' | 'unionpay';
      tier?: 'classic' | 'gold' | 'platinum' | 'black' | 'infinite';
      category?: 'debit' | 'credit' | 'prepaid';
      spendingLimit?: number;
      dailyLimit?: number;
      billingAddress?: VirtualCard['billingAddress'];
    } = {}
  ): VirtualCard | null {
    // Obtener cuenta custodio
    const custodyAccount = custodyStore.getAccountById(custodyAccountId);
    if (!custodyAccount) {
      console.error('[CardsStore] ❌ Cuenta custodio no encontrada:', custodyAccountId);
      return null;
    }

    // Configuración por defecto
    const network = options.network || 'visa';
    const tier = options.tier || 'platinum';
    const category = options.category || 'debit';

    // Generar datos de la tarjeta
    const cardNumber = this.generateCardNumber(network, tier);
    const cvv = this.generateCVV(network);
    const expiry = this.generateExpiry();

    // Límites basados en balance de cuenta custodio
    const accountBalance = custodyAccount.availableBalance;
    const defaultLimit = Math.min(accountBalance, 1000000); // Máximo 1M por defecto
    
    const card: VirtualCard = {
      id: `CARD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      cardNumber: cardNumber,
      cardNumberMasked: this.maskCardNumber(cardNumber),
      expiryMonth: expiry.month,
      expiryYear: expiry.year,
      cvv: this.encrypt(cvv), // CVV encriptado
      cardholderName: cardholderName.toUpperCase(),
      
      cardType: 'virtual',
      cardNetwork: network,
      cardCategory: category,
      cardTier: tier,
      
      custodyAccountId: custodyAccount.id,
      custodyAccountName: custodyAccount.accountName,
      currency: custodyAccount.currency,
      
      spendingLimit: options.spendingLimit || defaultLimit,
      dailyLimit: options.dailyLimit || defaultLimit * 0.2,
      monthlyLimit: defaultLimit,
      perTransactionLimit: defaultLimit * 0.1,
      
      availableBalance: accountBalance,
      currentBalance: accountBalance,
      
      status: 'active',
      activatedAt: new Date().toISOString(),
      
      pinSet: false,
      threeDSecure: true,
      contactless: true,
      
      billingAddress: options.billingAddress,
      
      createdAt: new Date().toISOString(),
      expiresAt: expiry.expiresAt,
      
      totalSpent: 0,
      transactionCount: 0,
      
      kycVerified: custodyAccount.kycVerified,
      amlCleared: custodyAccount.fatfAmlVerified,
      
      cardToken: this.generateCardToken(),
    };

    // Guardar
    const cards = this.getCards();
    cards.push(card);
    this.saveCards(cards);

    console.log('[CardsStore] ✅ Tarjeta emitida:', {
      id: card.id,
      network: card.cardNetwork,
      tier: card.cardTier,
      masked: card.cardNumberMasked,
      custodyAccount: custodyAccount.accountName,
      currency: card.currency,
      limit: card.spendingLimit,
    });

    return card;
  }

  /**
   * Obtener CVV desencriptado (requiere autenticación)
   */
  getCardCVV(cardId: string): string | null {
    const card = this.getCards().find(c => c.id === cardId);
    if (!card) return null;
    return this.decrypt(card.cvv);
  }

  /**
   * Obtener número completo de tarjeta (requiere autenticación)
   */
  getFullCardNumber(cardId: string): string | null {
    const card = this.getCards().find(c => c.id === cardId);
    if (!card) return null;
    return card.cardNumber;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 GESTIÓN DE TARJETAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener todas las tarjetas
   */
  getCards(): VirtualCard[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Obtener tarjetas por cuenta custodio
   */
  getCardsByCustodyAccount(custodyAccountId: string): VirtualCard[] {
    return this.getCards().filter(c => c.custodyAccountId === custodyAccountId);
  }

  /**
   * Guardar tarjetas
   */
  private saveCards(cards: VirtualCard[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    this.notifyListeners(cards);
  }

  /**
   * Activar/Desactivar tarjeta
   */
  toggleCardStatus(cardId: string, active: boolean): boolean {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    card.status = active ? 'active' : 'inactive';
    this.saveCards(cards);
    
    console.log(`[CardsStore] ${active ? '✅' : '⏸️'} Tarjeta ${card.cardNumberMasked} ${active ? 'activada' : 'desactivada'}`);
    return true;
  }

  /**
   * Congelar tarjeta (por seguridad)
   */
  freezeCard(cardId: string): boolean {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    card.status = 'frozen';
    this.saveCards(cards);
    
    console.log(`[CardsStore] 🧊 Tarjeta ${card.cardNumberMasked} congelada`);
    return true;
  }

  /**
   * Cancelar tarjeta permanentemente
   */
  cancelCard(cardId: string): boolean {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    card.status = 'cancelled';
    this.saveCards(cards);
    
    console.log(`[CardsStore] ❌ Tarjeta ${card.cardNumberMasked} cancelada`);
    return true;
  }

  /**
   * Eliminar tarjeta
   */
  deleteCard(cardId: string): boolean {
    const cards = this.getCards().filter(c => c.id !== cardId);
    this.saveCards(cards);
    return true;
  }

  /**
   * Actualizar límites
   */
  updateLimits(
    cardId: string,
    limits: {
      spendingLimit?: number;
      dailyLimit?: number;
      monthlyLimit?: number;
      perTransactionLimit?: number;
    }
  ): boolean {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    if (limits.spendingLimit !== undefined) card.spendingLimit = limits.spendingLimit;
    if (limits.dailyLimit !== undefined) card.dailyLimit = limits.dailyLimit;
    if (limits.monthlyLimit !== undefined) card.monthlyLimit = limits.monthlyLimit;
    if (limits.perTransactionLimit !== undefined) card.perTransactionLimit = limits.perTransactionLimit;

    this.saveCards(cards);
    return true;
  }

  /**
   * Establecer PIN
   */
  setCardPIN(cardId: string, pin: string): boolean {
    if (!/^\d{4,6}$/.test(pin)) {
      console.error('[CardsStore] PIN inválido (debe ser 4-6 dígitos)');
      return false;
    }

    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    card.pin = this.encrypt(pin);
    card.pinSet = true;
    this.saveCards(cards);
    
    console.log(`[CardsStore] 🔐 PIN establecido para tarjeta ${card.cardNumberMasked}`);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 💳 TRANSACCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Registrar transacción
   */
  recordTransaction(
    cardId: string,
    type: CardTransaction['type'],
    amount: number,
    merchant?: string,
    merchantCategory?: string
  ): CardTransaction | null {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return null;

    // Verificar estado
    if (card.status !== 'active') {
      console.error('[CardsStore] ❌ Tarjeta no activa');
      return null;
    }

    // Verificar límites para compras
    if (type === 'purchase' || type === 'withdrawal') {
      if (amount > card.perTransactionLimit) {
        console.error('[CardsStore] ❌ Excede límite por transacción');
        return null;
      }
      if (amount > card.availableBalance) {
        console.error('[CardsStore] ❌ Saldo insuficiente');
        return null;
      }
    }

    const transaction: CardTransaction = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      cardId,
      type,
      amount,
      currency: card.currency,
      merchant,
      merchantCategory,
      status: 'completed',
      timestamp: new Date().toISOString(),
      reference: `REF${Date.now()}`,
    };

    // Actualizar balance de la tarjeta
    if (type === 'purchase' || type === 'withdrawal' || type === 'fee') {
      card.availableBalance -= amount;
      card.totalSpent += amount;
    } else if (type === 'refund') {
      card.availableBalance += amount;
      card.totalSpent -= amount;
    }
    
    card.transactionCount++;
    card.lastUsed = new Date().toISOString();

    this.saveCards(cards);

    // Guardar transacción
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

    console.log(`[CardsStore] 💳 Transacción registrada: ${type} ${card.currency} ${amount}`);
    return transaction;
  }

  /**
   * Obtener transacciones
   */
  getTransactions(cardId?: string): CardTransaction[] {
    try {
      const stored = localStorage.getItem(TRANSACTIONS_KEY);
      if (!stored) return [];
      const all: CardTransaction[] = JSON.parse(stored);
      return cardId ? all.filter(t => t.cardId === cardId) : all;
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════════

  getStats() {
    const cards = this.getCards();
    const transactions = this.getTransactions();
    
    return {
      totalCards: cards.length,
      activeCards: cards.filter(c => c.status === 'active').length,
      frozenCards: cards.filter(c => c.status === 'frozen').length,
      totalSpent: cards.reduce((sum, c) => sum + c.totalSpent, 0),
      totalTransactions: transactions.length,
      byNetwork: {
        visa: cards.filter(c => c.cardNetwork === 'visa').length,
        mastercard: cards.filter(c => c.cardNetwork === 'mastercard').length,
        amex: cards.filter(c => c.cardNetwork === 'amex').length,
        unionpay: cards.filter(c => c.cardNetwork === 'unionpay').length,
      },
      byTier: {
        classic: cards.filter(c => c.cardTier === 'classic').length,
        gold: cards.filter(c => c.cardTier === 'gold').length,
        platinum: cards.filter(c => c.cardTier === 'platinum').length,
        black: cards.filter(c => c.cardTier === 'black').length,
        infinite: cards.filter(c => c.cardTier === 'infinite').length,
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔔 SUSCRIPTORES
  // ═══════════════════════════════════════════════════════════════════════════

  subscribe(listener: (cards: VirtualCard[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCards());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(cards: VirtualCard[]): void {
    this.listeners.forEach(l => l(cards));
  }

  /**
   * Sincronizar balance con cuenta custodio
   */
  syncBalanceWithCustody(cardId: string): boolean {
    const cards = this.getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    const custodyAccount = custodyStore.getAccountById(card.custodyAccountId);
    if (!custodyAccount) return false;

    card.availableBalance = custodyAccount.availableBalance;
    card.currentBalance = custodyAccount.totalBalance;
    
    this.saveCards(cards);
    console.log(`[CardsStore] 🔄 Balance sincronizado con cuenta custodio: ${card.currency} ${card.availableBalance}`);
    return true;
  }
}

export const cardsStore = new CardsStore();

