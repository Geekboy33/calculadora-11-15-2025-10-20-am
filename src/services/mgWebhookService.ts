/**
 * MG Webhook Service - DAES CoreBanking
 * Servicio para enviar transferencias desde DAES hacia MG Productive Investments
 * 
 * Banco Emisor: Digital Commercial Bank Ltd (DCB)
 * Core Bancario: DAES (Digital Asset Exchange & Settlement)
 * Banco Receptor: MG Productive Investments
 * 
 * Este servicio realiza llamadas HTTP POST directas al webhook de MG
 * sin intermediarios (sin MindCloud).
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

// ============================================================================
// Interfaces y Tipos
// ============================================================================

/**
 * Parámetros requeridos para enviar una transferencia a MG
 */
export interface MgTransferParams {
  /** ID interno DAES, único por transacción (ej: "TX-2025-00001") */
  transferRequestId: string;
  
  /** Monto de la transferencia (ej: "1000.00") */
  amount: string;
  
  /** Moneda de recepción (ej: "USD") */
  receivingCurrency: string;
  
  /** Cuenta receptora en MG (ej: "MG-001") */
  receivingAccount: string;
  
  /** Nombre del remitente (ej: "Digital Commercial Bank Ltd" o nombre del cliente) */
  sendingName: string;
  
  /** Fecha y hora en formato ISO 8601 UTC (opcional, se genera automáticamente si no se proporciona) */
  dateTime?: string;
}

/**
 * Payload exacto que espera el webhook de MG
 * IMPORTANTE: MG usa el formato CashTransfer.v1 (no CashTransfer)
 */
interface MgWebhookPayload {
  'CashTransfer.v1': {
    TransferRequestID: string;
    Amount: string;
    ReceivingCurrency: string;
    ReceivingAccount: string;
    SendingName: string;
    DateTime: string;
  };
}

/**
 * Respuesta del webhook de MG (estructura básica)
 */
export interface MgWebhookResponse {
  success?: boolean;
  message?: string;
  transactionId?: string;
  [key: string]: any; // Permite campos adicionales que MG pueda devolver
}

// ============================================================================
// Configuración
// ============================================================================

/**
 * URL del webhook de MG Productive Investments
 * USA PROXY DEL BACKEND para evitar problemas de CORS
 * El proxy reenvía la petición al endpoint real de MG
 */
const getWebhookUrl = (): string => {
  // Leer desde variable de entorno si existe
  const viteUrl = (import.meta.env?.VITE_MG_WEBHOOK_URL as string | undefined);
  if (viteUrl) {
    return viteUrl;
  }
  
  // USAR PROXY DEL BACKEND (evita CORS)
  // El backend en localhost:8787 reenvía la petición a MG
  return 'http://localhost:8787/api/mg-webhook/transfer';
};

/**
 * Timeout para las peticiones HTTP (15 segundos)
 */
const REQUEST_TIMEOUT_MS = 15000;

// ============================================================================
// Validaciones
// ============================================================================

/**
 * Valida que todos los parámetros requeridos estén presentes
 * @throws Error si falta algún parámetro requerido
 */
function validateParams(params: MgTransferParams): void {
  const errors: string[] = [];

  if (!params.transferRequestId || params.transferRequestId.trim() === '') {
    errors.push('transferRequestId es requerido');
  }

  if (!params.amount || params.amount.trim() === '') {
    errors.push('amount es requerido');
  }

  if (!params.receivingCurrency || params.receivingCurrency.trim() === '') {
    errors.push('receivingCurrency es requerido');
  }

  if (!params.receivingAccount || params.receivingAccount.trim() === '') {
    errors.push('receivingAccount es requerido');
  }

  if (!params.sendingName || params.sendingName.trim() === '') {
    errors.push('sendingName es requerido');
  }

  if (errors.length > 0) {
    throw new Error(`Parámetros inválidos: ${errors.join(', ')}`);
  }
}

/**
 * Normaliza el DateTime a formato ISO 8601 UTC
 * Si no se proporciona, genera uno automáticamente
 */
function normalizeDateTime(dateTime?: string): string {
  if (dateTime) {
    // Validar que sea un formato ISO válido
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      console.warn('[MG Webhook] DateTime proporcionado inválido, generando uno nuevo');
      return new Date().toISOString();
    }
    return date.toISOString();
  }
  
  // Generar DateTime automáticamente
  return new Date().toISOString();
}

// ============================================================================
// Función Principal
// ============================================================================

/**
 * Envía una transferencia desde DAES hacia MG Productive Investments
 * 
 * Flujo:
 * 1. Valida los parámetros de entrada
 * 2. Construye el payload en el formato exacto que MG espera
 * 3. Realiza POST HTTP al webhook de MG
 * 4. Retorna la respuesta si es exitosa (200 OK)
 * 5. Lanza error si falla
 * 
 * IMPORTANTE: Antes de llamar a esta función, el DAES debe:
 * - Validar que el saldo sea suficiente
 * - Debitar el ledger interno
 * - Guardar el transferRequestId para tracking
 * 
 * Después de una respuesta 200 OK, el DAES puede:
 * - Marcar la transacción como enviada al banco MG
 * - Actualizar el estado en el ledger
 * 
 * @param params Parámetros de la transferencia
 * @returns Respuesta del webhook de MG
 * @throws Error si la validación falla o si la petición HTTP falla
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await sendTransferToMG({
 *     transferRequestId: "TX-2025-00001",
 *     amount: "1000.00",
 *     receivingCurrency: "USD",
 *     receivingAccount: "MG-001",
 *     sendingName: "Digital Commercial Bank Ltd"
 *   });
 *   console.log('Transferencia enviada exitosamente:', response);
 * } catch (error) {
 *   console.error('Error al enviar transferencia:', error);
 * }
 * ```
 */
export async function sendTransferToMG(
  params: MgTransferParams
): Promise<MgWebhookResponse> {
  const webhookUrl = getWebhookUrl();
  
  try {
    // 1. Validar parámetros
    validateParams(params);
    
    // 2. Normalizar DateTime
    const dateTime = normalizeDateTime(params.dateTime);
    
    // 3. Construir payload EXACTO que MG espera
    const payload: MgWebhookPayload = {
      'CashTransfer.v1': {
        TransferRequestID: params.transferRequestId,
        Amount: params.amount,
        ReceivingCurrency: params.receivingCurrency,
        ReceivingAccount: params.receivingAccount,
        SendingName: params.sendingName,
        DateTime: dateTime
      }
    };
    
    // 4. Log antes de enviar
    console.log('[MG Webhook] Enviando transferencia a MG:', {
      url: webhookUrl,
      transferRequestId: params.transferRequestId,
      amount: params.amount,
      receivingCurrency: params.receivingCurrency,
      receivingAccount: params.receivingAccount,
      dateTime: dateTime
    });
    console.log('[MG Webhook] Payload completo:', JSON.stringify(payload, null, 2));
    
    // 5. Realizar petición HTTP POST
    const response: AxiosResponse<MgWebhookResponse> = await axios.post(
      webhookUrl,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: REQUEST_TIMEOUT_MS
      }
    );
    
    // 6. Log de respuesta exitosa
    console.log('[MG Webhook] ✅ Respuesta exitosa de MG:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    // 7. Retornar respuesta
    return response.data;
    
  } catch (error) {
    // 8. Manejo de errores detallado
    console.error('[MG Webhook] ❌ ERROR COMPLETO:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MgWebhookResponse>;
      
      // Log detallado del error
      console.error('[MG Webhook] ❌ Tipo: Error de Axios', {
        message: axiosError.message,
        code: axiosError.code,
        url: webhookUrl
      });
      
      if (axiosError.response) {
        // El servidor respondió con un código de error (4xx, 5xx)
        console.error('[MG Webhook] ❌ El servidor MG respondió con error:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          headers: axiosError.response.headers,
          data: axiosError.response.data
        });
        
        throw new Error(
          `Error del servidor MG: HTTP ${axiosError.response.status} - ${axiosError.response.statusText}. ` +
          `Respuesta: ${JSON.stringify(axiosError.response.data)}`
        );
      } else if (axiosError.request) {
        // La petición se hizo pero no hubo respuesta (timeout, network error, CORS)
        console.error('[MG Webhook] ❌ Sin respuesta del servidor MG:', {
          code: axiosError.code,
          message: axiosError.message,
          timeout: axiosError.code === 'ECONNABORTED',
          networkError: axiosError.code === 'ERR_NETWORK',
          corsError: axiosError.message.includes('CORS') || axiosError.message.includes('cors')
        });
        
        // Identificar el tipo de error
        let errorType = 'Error de red';
        let errorDetail = axiosError.message;
        
        if (axiosError.code === 'ECONNABORTED') {
          errorType = 'Timeout';
          errorDetail = 'El servidor MG tardó más de 15 segundos en responder';
        } else if (axiosError.code === 'ERR_NETWORK') {
          errorType = 'Error de red';
          errorDetail = 'No se pudo conectar al servidor MG. Posibles causas:\n' +
                       '1. El servidor no está disponible\n' +
                       '2. Problemas de CORS (el servidor debe permitir peticiones desde tu origen)\n' +
                       '3. Firewall o restricciones de red';
        } else if (axiosError.message.toLowerCase().includes('cors')) {
          errorType = 'Error CORS';
          errorDetail = 'El servidor MG no permite peticiones desde el navegador.\n' +
                       'Solución: El servidor MG debe agregar headers CORS o usar un proxy backend.';
        }
        
        throw new Error(
          `${errorType}: ${errorDetail}\n\n` +
          `URL: ${webhookUrl}\n` +
          `Código: ${axiosError.code || 'N/A'}`
        );
      } else {
        // Error al configurar la petición
        console.error('[MG Webhook] ❌ Error al configurar la petición:', {
          message: axiosError.message,
          stack: axiosError.stack
        });
        
        throw new Error(
          `Error al configurar la petición: ${axiosError.message}`
        );
      }
    } else {
      // Error no relacionado con axios (ej: validación)
      console.error('[MG Webhook] ❌ Error no relacionado con HTTP:', error);
      
      throw error instanceof Error 
        ? error 
        : new Error(`Error desconocido: ${String(error)}`);
    }
  }
}

// ============================================================================
// Función de Demostración
// ============================================================================

/**
 * Función de demostración para probar el servicio
 * 
 * NOTA: Esta función es solo para pruebas. En producción,
 * esta función debe ser llamada desde el módulo de liquidación
 * bancaria (BankSettlementModule) después de:
 * 
 * 1. Validar saldo suficiente
 * 2. Debitar el ledger interno
 * 3. Guardar el transferRequestId en la base de datos
 * 
 * Después de una respuesta 200 OK:
 * - Marcar la transacción como enviada al banco MG
 * - Actualizar el estado en el ledger
 * - Registrar el evento en el audit log
 */
export async function demoSendToMG(): Promise<void> {
  try {
    console.log('[MG Webhook Demo] Iniciando demostración...');
    
    const result = await sendTransferToMG({
      transferRequestId: "TX-2025-00001",
      amount: "1000.00",
      receivingCurrency: "USD",
      receivingAccount: "MG-001",
      sendingName: "Digital Commercial Bank Ltd",
      // Opcional: dateTime se genera automáticamente si no se proporciona
      // dateTime: "2025-11-28T15:14:02Z"
    });
    
    console.log('[MG Webhook Demo] ✅ Transferencia enviada exitosamente:', result);
    
  } catch (error) {
    console.error('[MG Webhook Demo] ❌ Error en demostración:', error);
    throw error;
  }
}

// ============================================================================
// Exportaciones
// ============================================================================

export default {
  sendTransferToMG,
  demoSendToMG
};

