/**
 * 3D Secure Authentication System
 * Sistema de autenticación de transacciones con códigos OTP
 * 
 * Protocolos soportados:
 * - 3D Secure 2.0 (EMV 3DS)
 * - Verified by Visa (VbV)
 * - Mastercard SecureCode
 * - American Express SafeKey
 * 
 * Métodos de autenticación:
 * - OTP por SMS
 * - OTP por Email
 * - Push Notification
 * - Biométrico (simulado)
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ThreeDSChallenge {
  id: string;
  cardId: string;
  cardLast4: string;
  transactionId: string;
  amount: number;
  currency: string;
  merchant: string;
  merchantCategory?: string;
  
  // Código OTP
  otpCode: string;
  otpHash: string; // Hash del código para verificación
  otpMethod: 'sms' | 'email' | 'push' | 'app';
  otpSentTo: string; // Número o email parcialmente oculto
  
  // Tiempos
  createdAt: string;
  expiresAt: string;
  
  // Estado
  status: 'pending' | 'verified' | 'failed' | 'expired';
  attempts: number;
  maxAttempts: number;
  
  // Seguridad
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // 3DS Específico
  acsUrl?: string; // Access Control Server URL
  pareq?: string;  // Payment Authentication Request
  transStatus?: '3DS_AUTHENTICATED' | '3DS_ATTEMPTED' | '3DS_FAILED' | '3DS_REJECTED';
  eci?: string;    // Electronic Commerce Indicator
  cavv?: string;   // Cardholder Authentication Verification Value
}

export interface ThreeDSVerifyResult {
  success: boolean;
  transactionId: string;
  authenticationValue?: string; // CAVV
  eci?: string;
  dsTransId?: string;
  status: 'AUTHENTICATED' | 'ATTEMPTED' | 'FAILED' | 'REJECTED' | 'EXPIRED';
  message: string;
}

export interface ThreeDSConfig {
  cardId: string;
  phoneNumber?: string;
  email?: string;
  preferredMethod: 'sms' | 'email' | 'push' | 'app';
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔢 GENERACIÓN DE CÓDIGOS OTP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generar código OTP numérico de 6 dígitos
 */
function generateOTPCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Generar código OTP alfanumérico
 */
function generateAlphanumericOTP(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generar código TOTP basado en tiempo (como Google Authenticator)
 */
function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeHex = time.toString(16).padStart(16, '0');
  const hmac = CryptoJS.HmacSHA1(CryptoJS.enc.Hex.parse(timeHex), secret);
  const hmacHex = hmac.toString(CryptoJS.enc.Hex);
  
  // Dynamic truncation
  const offset = parseInt(hmacHex.slice(-1), 16);
  const binary = parseInt(hmacHex.substr(offset * 2, 8), 16) & 0x7fffffff;
  const otp = (binary % 1000000).toString().padStart(6, '0');
  
  return otp;
}

/**
 * Hash del código para almacenamiento seguro
 */
function hashOTPCode(code: string, salt: string): string {
  return CryptoJS.SHA256(code + salt).toString();
}

/**
 * Ocultar parcialmente número de teléfono
 */
function maskPhoneNumber(phone: string): string {
  if (phone.length < 4) return '****';
  return '****' + phone.slice(-4);
}

/**
 * Ocultar parcialmente email
 */
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '****@****';
  const maskedUser = user.charAt(0) + '***' + (user.length > 1 ? user.charAt(user.length - 1) : '');
  return maskedUser + '@' + domain;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 CLASE PRINCIPAL: ThreeDSecureService
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'daes_3ds_challenges';
const CONFIG_KEY = 'daes_3ds_config';
const OTP_VALIDITY_SECONDS = 300; // 5 minutos
const MAX_ATTEMPTS = 3;

class ThreeDSecureService {
  private challenges: Map<string, ThreeDSChallenge> = new Map();
  private configs: Map<string, ThreeDSConfig> = new Map();
  private listeners: Set<(challenges: ThreeDSChallenge[]) => void> = new Set();
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const challenges: ThreeDSChallenge[] = JSON.parse(stored);
        challenges.forEach(c => this.challenges.set(c.id, c));
      }
      
      const configStored = localStorage.getItem(CONFIG_KEY);
      if (configStored) {
        const configs: ThreeDSConfig[] = JSON.parse(configStored);
        configs.forEach(c => this.configs.set(c.cardId, c));
      }
    } catch (e) {
      console.error('[3DS] Error loading from storage:', e);
    }
  }
  
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.challenges.values())));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(Array.from(this.configs.values())));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📱 CONFIGURACIÓN DE 3DS POR TARJETA
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configurar 3D Secure para una tarjeta
   */
  configure3DS(config: ThreeDSConfig): void {
    this.configs.set(config.cardId, config);
    this.saveToStorage();
    console.log(`[3DS] ✅ Configurado para tarjeta ${config.cardId}`);
  }
  
  /**
   * Obtener configuración de una tarjeta
   */
  getConfig(cardId: string): ThreeDSConfig | null {
    return this.configs.get(cardId) || null;
  }
  
  /**
   * Verificar si 3DS está habilitado para una tarjeta
   */
  is3DSEnabled(cardId: string): boolean {
    const config = this.configs.get(cardId);
    return config?.enabled ?? false;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔑 GENERACIÓN DE CHALLENGES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Crear un nuevo challenge de autenticación 3DS
   */
  createChallenge(data: {
    cardId: string;
    cardLast4: string;
    transactionId?: string;
    amount: number;
    currency: string;
    merchant: string;
    merchantCategory?: string;
    phoneNumber?: string;
    email?: string;
    method?: 'sms' | 'email' | 'push' | 'app';
  }): ThreeDSChallenge {
    // Obtener configuración de la tarjeta
    const config = this.configs.get(data.cardId);
    const method = data.method || config?.preferredMethod || 'sms';
    
    // Determinar destino del OTP
    let destination = '';
    let maskedDestination = '';
    
    if (method === 'sms') {
      destination = data.phoneNumber || config?.phoneNumber || '+1234567890';
      maskedDestination = maskPhoneNumber(destination);
    } else if (method === 'email') {
      destination = data.email || config?.email || 'user@example.com';
      maskedDestination = maskEmail(destination);
    } else {
      maskedDestination = 'App DAES Banking';
    }
    
    // Generar código OTP
    const otpCode = generateOTPCode(6);
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    const otpHash = hashOTPCode(otpCode, salt);
    
    // Generar IDs únicos
    const challengeId = `3DS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const transactionId = data.transactionId || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Generar CAVV y ECI para respuesta
    const cavv = CryptoJS.SHA256(challengeId + otpCode).toString().substring(0, 28);
    const eci = data.cardId.includes('visa') ? '05' : '02'; // Visa=05, MC=02
    
    const challenge: ThreeDSChallenge = {
      id: challengeId,
      cardId: data.cardId,
      cardLast4: data.cardLast4,
      transactionId,
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant,
      merchantCategory: data.merchantCategory,
      
      otpCode, // En producción real, esto NO se almacenaría así
      otpHash,
      otpMethod: method,
      otpSentTo: maskedDestination,
      
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + OTP_VALIDITY_SECONDS * 1000).toISOString(),
      
      status: 'pending',
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      
      eci,
      cavv,
    };
    
    this.challenges.set(challengeId, challenge);
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[3DS] 🔐 Challenge creado:', {
      id: challengeId,
      method,
      sentTo: maskedDestination,
      amount: `${data.currency} ${data.amount}`,
      merchant: data.merchant,
      expiresIn: `${OTP_VALIDITY_SECONDS} segundos`,
    });
    
    // Simular envío de OTP
    this.simulateSendOTP(challenge, destination, otpCode);
    
    return challenge;
  }
  
  /**
   * Simular envío de OTP (en producción usaría SMS/Email real)
   */
  private simulateSendOTP(challenge: ThreeDSChallenge, destination: string, code: string): void {
    console.log('[3DS] 📱 Simulando envío de OTP...');
    console.log(`[3DS] 📤 Método: ${challenge.otpMethod.toUpperCase()}`);
    console.log(`[3DS] 📍 Destino: ${destination}`);
    console.log(`[3DS] 🔢 Código: ${code}`);
    console.log('[3DS] ─────────────────────────────────────');
    console.log(`[3DS] 💰 Transacción: ${challenge.currency} ${challenge.amount.toLocaleString()}`);
    console.log(`[3DS] 🏪 Comercio: ${challenge.merchant}`);
    console.log('[3DS] ─────────────────────────────────────');
    
    // En producción, aquí se enviaría el SMS/Email real
    // Por ejemplo con Twilio, SendGrid, etc.
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ VERIFICACIÓN DE CÓDIGOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Verificar código OTP
   */
  verifyOTP(challengeId: string, inputCode: string): ThreeDSVerifyResult {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return {
        success: false,
        transactionId: '',
        status: 'FAILED',
        message: 'Challenge no encontrado',
      };
    }
    
    // Verificar si ya expiró
    if (new Date() > new Date(challenge.expiresAt)) {
      challenge.status = 'expired';
      challenge.transStatus = '3DS_FAILED';
      this.saveToStorage();
      this.notifyListeners();
      
      return {
        success: false,
        transactionId: challenge.transactionId,
        status: 'EXPIRED',
        message: 'El código ha expirado. Solicite uno nuevo.',
      };
    }
    
    // Verificar intentos
    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.status = 'failed';
      challenge.transStatus = '3DS_REJECTED';
      this.saveToStorage();
      this.notifyListeners();
      
      return {
        success: false,
        transactionId: challenge.transactionId,
        status: 'REJECTED',
        message: 'Máximo de intentos alcanzado. Transacción rechazada.',
      };
    }
    
    // Incrementar intentos
    challenge.attempts++;
    
    // Verificar código
    const cleanInput = inputCode.replace(/\s/g, '').toUpperCase();
    const isValid = cleanInput === challenge.otpCode;
    
    if (isValid) {
      challenge.status = 'verified';
      challenge.transStatus = '3DS_AUTHENTICATED';
      this.saveToStorage();
      this.notifyListeners();
      
      console.log('[3DS] ✅ Autenticación exitosa:', challengeId);
      
      return {
        success: true,
        transactionId: challenge.transactionId,
        authenticationValue: challenge.cavv,
        eci: challenge.eci,
        dsTransId: challengeId,
        status: 'AUTHENTICATED',
        message: 'Autenticación exitosa. Transacción autorizada.',
      };
    } else {
      const remainingAttempts = challenge.maxAttempts - challenge.attempts;
      this.saveToStorage();
      this.notifyListeners();
      
      console.log(`[3DS] ❌ Código incorrecto. Intentos restantes: ${remainingAttempts}`);
      
      return {
        success: false,
        transactionId: challenge.transactionId,
        status: 'FAILED',
        message: `Código incorrecto. ${remainingAttempts} intento(s) restante(s).`,
      };
    }
  }
  
  /**
   * Reenviar código OTP
   */
  resendOTP(challengeId: string): { success: boolean; message: string; newCode?: string } {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return { success: false, message: 'Challenge no encontrado' };
    }
    
    if (challenge.status !== 'pending') {
      return { success: false, message: 'Este challenge ya no está activo' };
    }
    
    // Generar nuevo código
    const newCode = generateOTPCode(6);
    challenge.otpCode = newCode;
    
    // Extender expiración
    challenge.expiresAt = new Date(Date.now() + OTP_VALIDITY_SECONDS * 1000).toISOString();
    challenge.attempts = 0; // Reset intentos al reenviar
    
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[3DS] 🔄 Código reenviado:', newCode);
    
    return {
      success: true,
      message: `Nuevo código enviado a ${challenge.otpSentTo}`,
      newCode, // En producción no se devolvería esto
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener challenge por ID
   */
  getChallenge(challengeId: string): ThreeDSChallenge | null {
    return this.challenges.get(challengeId) || null;
  }
  
  /**
   * Obtener challenges pendientes de una tarjeta
   */
  getPendingChallenges(cardId: string): ThreeDSChallenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.cardId === cardId && c.status === 'pending');
  }
  
  /**
   * Obtener todos los challenges
   */
  getAllChallenges(): ThreeDSChallenge[] {
    return Array.from(this.challenges.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  /**
   * Obtener historial de autenticaciones
   */
  getAuthHistory(cardId?: string): ThreeDSChallenge[] {
    let challenges = Array.from(this.challenges.values());
    
    if (cardId) {
      challenges = challenges.filter(c => c.cardId === cardId);
    }
    
    return challenges
      .filter(c => c.status !== 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  /**
   * Cancelar challenge
   */
  cancelChallenge(challengeId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    
    challenge.status = 'failed';
    challenge.transStatus = '3DS_REJECTED';
    this.saveToStorage();
    this.notifyListeners();
    
    return true;
  }
  
  /**
   * Limpiar challenges expirados
   */
  cleanExpiredChallenges(): number {
    const now = new Date();
    let cleaned = 0;
    
    this.challenges.forEach((challenge, id) => {
      if (challenge.status === 'pending' && new Date(challenge.expiresAt) < now) {
        challenge.status = 'expired';
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }
    
    return cleaned;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔢 GENERADOR DE CÓDIGOS STANDALONE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generar código OTP simple (para uso manual)
   */
  generateCode(type: 'numeric' | 'alphanumeric' | 'totp' = 'numeric', length: number = 6): {
    code: string;
    expiresAt: string;
    expiresInSeconds: number;
  } {
    let code: string;
    
    switch (type) {
      case 'alphanumeric':
        code = generateAlphanumericOTP(length);
        break;
      case 'totp':
        code = generateTOTP(CryptoJS.lib.WordArray.random(20).toString());
        break;
      case 'numeric':
      default:
        code = generateOTPCode(length);
    }
    
    const expiresInSeconds = OTP_VALIDITY_SECONDS;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    
    return { code, expiresAt, expiresInSeconds };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔔 SUSCRIPTORES
  // ═══════════════════════════════════════════════════════════════════════════
  
  subscribe(listener: (challenges: ThreeDSChallenge[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllChallenges());
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    const challenges = this.getAllChallenges();
    this.listeners.forEach(l => l(challenges));
  }
}

// Singleton
export const threeDSecureService = new ThreeDSecureService();

// Limpiar challenges expirados cada minuto
setInterval(() => {
  threeDSecureService.cleanExpiredChallenges();
}, 60000);

export default threeDSecureService;

