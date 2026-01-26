// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY - WEBHOOK CONFIGURATION
// Configuración fija de webhook para comunicación con LEMX Minting Platform
// ═══════════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN FIJA DE WEBHOOK - NO MODIFICAR
// ═══════════════════════════════════════════════════════════════════════════════

export const WEBHOOK_CONFIG = {
  // Identificador único del webhook
  webhookId: 'DCB-LEMX-WEBHOOK-001',
  
  // Secreto compartido para firmar webhooks (HMAC-SHA256)
  // Este secreto debe ser el mismo en ambas plataformas
  sharedSecret: 'dcb-lemx-secure-webhook-secret-2024-v1',
  
  // Versión del protocolo de webhook
  protocolVersion: '1.0.0',
  
  // Tiempo de expiración de la firma (5 minutos)
  signatureExpiryMs: 5 * 60 * 1000,
  
  // URLs de producción
  production: {
    dcbTreasury: {
      baseUrl: 'https://luxliqdaes.cloud/api',
      webhookReceive: 'https://luxliqdaes.cloud/api/webhooks/receive',
      health: 'https://luxliqdaes.cloud/api/health'
    },
    lemxMinting: {
      baseUrl: 'https://luxliqdaes.cloud/api/lemx',
      webhookReceive: 'https://luxliqdaes.cloud/api/lemx/webhooks/receive',
      health: 'https://luxliqdaes.cloud/api/lemx/health'
    }
  },
  
  // URLs de desarrollo
  development: {
    dcbTreasury: {
      baseUrl: 'http://localhost:4010/api',
      webhookReceive: 'http://localhost:4010/api/webhooks/receive',
      health: 'http://localhost:4010/api/health'
    },
    lemxMinting: {
      baseUrl: 'http://localhost:4011/api',
      webhookReceive: 'http://localhost:4011/api/webhooks/receive',
      health: 'http://localhost:4011/api/health'
    }
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE EVENTOS DE WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════

export type WebhookEventType = 
  // Eventos que DCB Treasury envía a LEMX Minting
  | 'lock.created'           // Nuevo lock creado - LEMX debe procesarlo
  | 'lock.cancelled'         // Lock cancelado por DCB
  | 'mint.request.created'   // DCB solicita minting con código autorizado
  
  // Eventos que LEMX Minting envía a DCB Treasury
  | 'authorization.generated' // LEMX generó código de autorización
  | 'mint.started'           // LEMX comenzó el proceso de minting
  | 'mint.completed'         // LEMX completó el minting - incluye txHash
  | 'mint.failed'            // LEMX falló en el minting
  
  // Eventos de sincronización
  | 'sync.request'           // Solicitud de sincronización
  | 'sync.response'          // Respuesta de sincronización
  | 'ping'                   // Verificación de conexión
  | 'pong';                  // Respuesta a ping

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRUCTURA DE EVENTO DE WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebhookEvent<T = any> {
  // Identificador único del evento
  id: string;
  
  // Tipo de evento
  type: WebhookEventType;
  
  // Timestamp ISO del evento
  timestamp: string;
  
  // Origen del evento
  source: 'dcb_treasury' | 'lemx_minting';
  
  // Versión del protocolo
  version: string;
  
  // Datos del evento
  payload: T;
  
  // Firma HMAC-SHA256
  signature?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOADS ESPECÍFICOS POR TIPO DE EVENTO
// ═══════════════════════════════════════════════════════════════════════════════

// DCB Treasury → LEMX: Lock creado
export interface LockCreatedPayload {
  lockId: string;
  amount: string;
  currency: string;
  beneficiary: string;
  custodyVault: string;
  bankId: string;
  bankName: string;
  signerAddress: string;
  expiry: string;
  daesTxnId?: string;
  isoHash?: string;
  metadata?: Record<string, any>;
}

// LEMX → DCB: Autorización generada
export interface AuthorizationGeneratedPayload {
  lockId: string;
  authorizationCode: string;
  amount: string;
  beneficiary: string;
  generatedAt: string;
  generatedBy: string;
  expiresAt: string;
}

// LEMX → DCB: Minting completado
export interface MintCompletedPayload {
  lockId: string;
  authorizationCode: string;
  publicationCode: string;
  txHash: string;
  blockNumber: number;
  mintedAmount: string;
  mintedAt: string;
  mintedBy: string;
  lusdContractAddress: string;
  gasUsed: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES DE FIRMA Y VERIFICACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera una firma HMAC-SHA256 para un evento de webhook
 */
export function signWebhookEvent(event: Omit<WebhookEvent, 'signature'>): string {
  const payload = JSON.stringify({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    source: event.source,
    version: event.version,
    payload: event.payload
  });
  
  return crypto
    .createHmac('sha256', WEBHOOK_CONFIG.sharedSecret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifica la firma de un evento de webhook
 */
export function verifyWebhookSignature(event: WebhookEvent): boolean {
  if (!event.signature) return false;
  
  // Verificar que el timestamp no sea muy antiguo
  const eventTime = new Date(event.timestamp).getTime();
  const now = Date.now();
  if (now - eventTime > WEBHOOK_CONFIG.signatureExpiryMs) {
    console.warn('Webhook signature expired');
    return false;
  }
  
  const expectedSignature = signWebhookEvent(event);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(event.signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return event.signature === expectedSignature;
  }
}

/**
 * Crea un evento de webhook firmado
 */
export function createWebhookEvent<T>(
  type: WebhookEventType,
  payload: T,
  source: 'dcb_treasury' | 'lemx_minting'
): WebhookEvent<T> {
  const event: Omit<WebhookEvent<T>, 'signature'> = {
    id: `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase(),
    type,
    timestamp: new Date().toISOString(),
    source,
    version: WEBHOOK_CONFIG.protocolVersion,
    payload
  };
  
  return {
    ...event,
    signature: signWebhookEvent(event)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER PARA OBTENER URLs SEGÚN ENTORNO
// ═══════════════════════════════════════════════════════════════════════════════

export function getWebhookUrls(isProduction: boolean = false) {
  return isProduction ? WEBHOOK_CONFIG.production : WEBHOOK_CONFIG.development;
}

/**
 * Obtiene la URL de webhook de LEMX Minting
 */
export function getLEMXWebhookUrl(isProduction: boolean = false): string {
  return getWebhookUrls(isProduction).lemxMinting.webhookReceive;
}

/**
 * Obtiene la URL de webhook de DCB Treasury
 */
export function getDCBWebhookUrl(isProduction: boolean = false): string {
  return getWebhookUrls(isProduction).dcbTreasury.webhookReceive;
}
