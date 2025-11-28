/**
 * Login Security Module - Protección Antihacking
 * Implementa múltiples capas de seguridad para el sistema de autenticación
 */

import { rateLimiter } from './rate-limiter';

// ==================== CONFIGURACIÓN ====================

const SECURITY_CONFIG = {
  // Rate Limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 5 * 60 * 1000, // 5 minutos
  BLOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutos de bloqueo
  
  // Validación
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Detección de patrones sospechosos
  SUSPICIOUS_PATTERNS: [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ],
  
  // Delay para prevenir timing attacks
  MIN_AUTH_DELAY_MS: 500,
  MAX_AUTH_DELAY_MS: 1500,
};

// ==================== INTERFACES ====================

export interface LoginAttempt {
  timestamp: number;
  username: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

export interface SecurityLog {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'BLOCKED' | 'SUSPICIOUS' | 'RATE_LIMIT';
  timestamp: number;
  username?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface LoginSecurityResult {
  success: boolean;
  blocked: boolean;
  blockedUntil?: Date;
  remainingAttempts?: number;
  error?: string;
  securityLog?: SecurityLog;
}

// ==================== CLASE DE SEGURIDAD ====================

class LoginSecurity {
  private failedAttempts: Map<string, LoginAttempt[]> = new Map();
  private securityLogs: SecurityLog[] = [];
  private readonly MAX_LOGS = 1000;

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  // ==================== HASH DE CONTRASEÑAS ====================
  
  /**
   * Genera hash SHA-256 de la contraseña
   * Usa Web Crypto API para seguridad del lado del cliente
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('[LoginSecurity] Error hashing password:', error);
      throw new Error('Error processing password');
    }
  }

  /**
   * Compara contraseña con hash de forma segura (timing-safe)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const passwordHash = await this.hashPassword(password);
      
      // Timing-safe comparison
      if (passwordHash.length !== hash.length) {
        return false;
      }
      
      let result = 0;
      for (let i = 0; i < passwordHash.length; i++) {
        result |= passwordHash.charCodeAt(i) ^ hash.charCodeAt(i);
      }
      
      return result === 0;
    } catch (error) {
      console.error('[LoginSecurity] Error verifying password:', error);
      return false;
    }
  }

  // ==================== VALIDACIÓN Y SANITIZACIÓN ====================
  
  /**
   * Valida y sanitiza entrada del usuario
   */
  validateInput(username: string, password: string): { valid: boolean; error?: string } {
    // Validar username
    if (!username || username.trim().length === 0) {
      return { valid: false, error: 'Username is required' };
    }
    
    if (username.length < SECURITY_CONFIG.MIN_USERNAME_LENGTH) {
      return { valid: false, error: `Username must be at least ${SECURITY_CONFIG.MIN_USERNAME_LENGTH} characters` };
    }
    
    if (username.length > SECURITY_CONFIG.MAX_USERNAME_LENGTH) {
      return { valid: false, error: `Username must be less than ${SECURITY_CONFIG.MAX_USERNAME_LENGTH} characters` };
    }
    
    // Validar password
    if (!password || password.length === 0) {
      return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
      return { valid: false, error: `Password must be at least ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters` };
    }
    
    if (password.length > SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
      return { valid: false, error: `Password must be less than ${SECURITY_CONFIG.MAX_PASSWORD_LENGTH} characters` };
    }
    
    // Detectar patrones sospechosos
    const suspiciousPattern = this.detectSuspiciousPattern(username + password);
    if (suspiciousPattern) {
      this.logSecurityEvent('SUSPICIOUS', {
        username,
        reason: `Suspicious pattern detected: ${suspiciousPattern}`,
        pattern: suspiciousPattern
      });
      return { valid: false, error: 'Invalid characters detected' };
    }
    
    return { valid: true };
  }

  /**
   * Detecta patrones sospechosos (XSS, injection, etc.)
   */
  private detectSuspiciousPattern(input: string): string | null {
    for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        return pattern.toString();
      }
    }
    return null;
  }

  /**
   * Sanitiza entrada removiendo caracteres peligrosos
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remover < y >
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .trim()
      .slice(0, SECURITY_CONFIG.MAX_USERNAME_LENGTH);
  }

  // ==================== RATE LIMITING Y BLOQUEO ====================
  
  /**
   * Verifica si el usuario está bloqueado
   */
  isBlocked(username: string): { blocked: boolean; blockedUntil?: Date } {
    const status = rateLimiter.getStatus('auth:login', username);
    
    if (status.isBlocked && status.blockedUntil) {
      return {
        blocked: true,
        blockedUntil: status.blockedUntil
      };
    }
    
    return { blocked: false };
  }

  /**
   * Verifica rate limit antes de intentar login
   */
  checkRateLimit(username: string): { allowed: boolean; remaining?: number; blockedUntil?: Date } {
    const allowed = rateLimiter.checkLimit('auth:login', username);
    const status = rateLimiter.getStatus('auth:login', username);
    
    if (!allowed) {
      this.logSecurityEvent('RATE_LIMIT', {
        username,
        reason: 'Rate limit exceeded',
        blockedUntil: status.blockedUntil
      });
    }
    
    return {
      allowed,
      remaining: status.remaining,
      blockedUntil: status.blockedUntil
    };
  }

  /**
   * Registra intento de login (exitoso o fallido)
   */
  recordLoginAttempt(username: string, success: boolean): void {
    const attempt: LoginAttempt = {
      timestamp: Date.now(),
      username: this.sanitizeInput(username),
      success,
      userAgent: navigator.userAgent,
    };
    
    if (!success) {
      const attempts = this.failedAttempts.get(username) || [];
      attempts.push(attempt);
      this.failedAttempts.set(username, attempts);
      
      // Limpiar intentos antiguos
      const recentAttempts = attempts.filter(
        a => a.timestamp > Date.now() - SECURITY_CONFIG.LOGIN_WINDOW_MS
      );
      this.failedAttempts.set(username, recentAttempts);
      
      // Registrar en rate limiter
      rateLimiter.recordRequest('auth:login', username);
      
      this.logSecurityEvent('LOGIN_FAILED', {
        username,
        reason: 'Invalid credentials',
        attemptCount: recentAttempts.length
      });
    } else {
      // Limpiar intentos fallidos en login exitoso
      this.failedAttempts.delete(username);
      rateLimiter.resetLimit('auth:login', username);
      
      this.logSecurityEvent('LOGIN_SUCCESS', {
        username
      });
    }
    
    this.saveToStorage();
  }

  /**
   * Obtiene número de intentos fallidos recientes
   */
  getFailedAttempts(username: string): number {
    const attempts = this.failedAttempts.get(username) || [];
    const now = Date.now();
    return attempts.filter(
      a => a.timestamp > now - SECURITY_CONFIG.LOGIN_WINDOW_MS
    ).length;
  }

  // ==================== TOKEN DE SESIÓN SEGURO ====================
  
  /**
   * Genera token de sesión seguro
   */
  async generateSessionToken(username: string): Promise<string> {
    const timestamp = Date.now();
    const random = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(random)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const tokenData = `${username}:${timestamp}:${randomHex}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return token;
  }

  /**
   * Valida token de sesión
   */
  validateSessionToken(token: string): boolean {
    // Validar formato (64 caracteres hex)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return false;
    }
    
    // Verificar que el token existe en localStorage
    const storedToken = localStorage.getItem('daes_session_token');
    return storedToken === token;
  }

  // ==================== LOGS DE SEGURIDAD ====================
  
  /**
   * Registra evento de seguridad
   */
  private logSecurityEvent(
    type: SecurityLog['type'],
    metadata?: Record<string, any>
  ): void {
    const log: SecurityLog = {
      type,
      timestamp: Date.now(),
      ...metadata
    };
    
    this.securityLogs.push(log);
    
    // Mantener solo los últimos N logs
    if (this.securityLogs.length > this.MAX_LOGS) {
      this.securityLogs = this.securityLogs.slice(-this.MAX_LOGS);
    }
    
    // Guardar en localStorage
    try {
      const recentLogs = this.securityLogs.slice(-100); // Solo últimos 100
      localStorage.setItem('daes_security_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('[LoginSecurity] Error saving security logs:', error);
    }
    
    // Log a consola en desarrollo
    if (import.meta.env.DEV) {
      console.log('[LoginSecurity]', log);
    }
  }

  /**
   * Obtiene logs de seguridad recientes
   */
  getSecurityLogs(limit: number = 50): SecurityLog[] {
    return this.securityLogs.slice(-limit).reverse();
  }

  // ==================== DELAY ANTI-TIMING ATTACK ====================
  
  /**
   * Añade delay aleatorio para prevenir timing attacks
   */
  async addAntiTimingDelay(): Promise<void> {
    const delay = SECURITY_CONFIG.MIN_AUTH_DELAY_MS + 
      Math.random() * (SECURITY_CONFIG.MAX_AUTH_DELAY_MS - SECURITY_CONFIG.MIN_AUTH_DELAY_MS);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // ==================== PERSISTENCIA ====================
  
  private saveToStorage(): void {
    try {
      const data = {
        failedAttempts: Array.from(this.failedAttempts.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('daes_login_security', JSON.stringify(data));
    } catch (error) {
      console.error('[LoginSecurity] Error saving to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('daes_login_security');
      if (stored) {
        const data = JSON.parse(stored);
        // Solo cargar si tiene menos de 1 hora
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          this.failedAttempts = new Map(data.failedAttempts || []);
        }
      }
    } catch (error) {
      console.error('[LoginSecurity] Error loading from storage:', error);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Limpiar intentos fallidos antiguos
      for (const [username, attempts] of this.failedAttempts.entries()) {
        const recentAttempts = attempts.filter(
          a => a.timestamp > now - SECURITY_CONFIG.LOGIN_WINDOW_MS
        );
        
        if (recentAttempts.length === 0) {
          this.failedAttempts.delete(username);
        } else {
          this.failedAttempts.set(username, recentAttempts);
        }
      }
      
      // Limpiar logs antiguos
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      this.securityLogs = this.securityLogs.filter(log => log.timestamp > oneDayAgo);
      
      this.saveToStorage();
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  // ==================== MÉTODO PRINCIPAL DE AUTENTICACIÓN ====================
  
  /**
   * Procesa intento de login con todas las medidas de seguridad
   */
  async authenticate(
    username: string,
    password: string,
    validUsername: string,
    validPasswordHash: string
  ): Promise<LoginSecurityResult> {
    // 1. Sanitizar entrada
    const sanitizedUsername = this.sanitizeInput(username);
    
    // 2. Validar entrada
    const validation = this.validateInput(sanitizedUsername, password);
    if (!validation.valid) {
      return {
        success: false,
        blocked: false,
        error: validation.error
      };
    }
    
    // 3. Verificar si está bloqueado
    const blockStatus = this.isBlocked(sanitizedUsername);
    if (blockStatus.blocked) {
      return {
        success: false,
        blocked: true,
        blockedUntil: blockStatus.blockedUntil,
        error: `Account temporarily blocked. Try again after ${blockStatus.blockedUntil?.toLocaleTimeString()}`
      };
    }
    
    // 4. Verificar rate limit
    const rateLimitStatus = this.checkRateLimit(sanitizedUsername);
    if (!rateLimitStatus.allowed) {
      return {
        success: false,
        blocked: true,
        blockedUntil: rateLimitStatus.blockedUntil,
        error: `Too many login attempts. Account blocked until ${rateLimitStatus.blockedUntil?.toLocaleTimeString()}`
      };
    }
    
    // 5. Añadir delay anti-timing
    await this.addAntiTimingDelay();
    
    // 6. Verificar credenciales
    const usernameMatch = sanitizedUsername === validUsername;
    const passwordMatch = await this.verifyPassword(password, validPasswordHash);
    
    const success = usernameMatch && passwordMatch;
    
    // 7. Registrar intento
    this.recordLoginAttempt(sanitizedUsername, success);
    
    // 8. Si es exitoso, generar token de sesión
    if (success) {
      const sessionToken = await this.generateSessionToken(sanitizedUsername);
      localStorage.setItem('daes_session_token', sessionToken);
      
      return {
        success: true,
        blocked: false
      };
    }
    
    // 9. Si falló, obtener intentos restantes
    const remainingAttempts = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - this.getFailedAttempts(sanitizedUsername);
    
    return {
      success: false,
      blocked: false,
      remainingAttempts: Math.max(0, remainingAttempts),
      error: remainingAttempts > 0 
        ? `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`
        : 'Invalid credentials.'
    };
  }
}

// Export singleton instance
export const loginSecurity = new LoginSecurity();

