/**
 * Ejemplos de Uso del Servicio MG Webhook
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar el servicio
 * de webhook de MG Productive Investments en diferentes escenarios.
 */

import { sendTransferToMG, MgTransferParams } from './mgWebhookService';

// ============================================================================
// Ejemplo 1: Transferencia Básica
// ============================================================================

/**
 * Ejemplo básico de envío de transferencia
 */
export async function ejemploTransferenciaBasica() {
  try {
    const params: MgTransferParams = {
      transferRequestId: "TX-2025-00001",
      amount: "1000.00",
      receivingCurrency: "USD",
      receivingAccount: "MG-001",
      sendingName: "Digital Commercial Bank Ltd"
    };

    const response = await sendTransferToMG(params);
    console.log('✅ Transferencia enviada:', response);
    
    return response;
  } catch (error) {
    console.error('❌ Error al enviar transferencia:', error);
    throw error;
  }
}

// ============================================================================
// Ejemplo 2: Transferencia con DateTime Personalizado
// ============================================================================

/**
 * Ejemplo con fecha y hora personalizada
 */
export async function ejemploConDateTimePersonalizado() {
  try {
    const params: MgTransferParams = {
      transferRequestId: "TX-2025-00002",
      amount: "5000.00",
      receivingCurrency: "USD",
      receivingAccount: "MG-002",
      sendingName: "Digital Commercial Bank Ltd",
      dateTime: "2025-11-28T15:14:02Z" // DateTime personalizado
    };

    const response = await sendTransferToMG(params);
    console.log('✅ Transferencia enviada con DateTime personalizado:', response);
    
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ============================================================================
// Ejemplo 3: Integración con Sistema de Liquidación
// ============================================================================

/**
 * Ejemplo de integración con el módulo de liquidación bancaria
 * 
 * Este ejemplo muestra cómo integrar el servicio MG con el flujo
 * completo de liquidación bancaria en DAES.
 */
export async function ejemploIntegracionLiquidacion(
  settlementId: string,
  amount: string,
  currency: string,
  mgAccount: string
) {
  try {
    // PASO 1: Validar saldo (esto debe hacerse antes de llamar al servicio)
    // const balance = await ledgerService.getBalance(accountId);
    // if (balance < parseFloat(amount)) {
    //   throw new Error('Saldo insuficiente');
    // }

    // PASO 2: Debitar del ledger interno (esto debe hacerse antes)
    // const debitResult = await ledgerService.debit({
    //   accountId: accountId,
    //   amount: amount,
    //   currency: currency,
    //   reference: `MG-Transfer-${settlementId}`
    // });

    // PASO 3: Generar TransferRequestID único
    const transferRequestId = `MG-${settlementId}-${Date.now()}`;

    // PASO 4: Enviar transferencia a MG
    const params: MgTransferParams = {
      transferRequestId: transferRequestId,
      amount: amount,
      receivingCurrency: currency,
      receivingAccount: mgAccount,
      sendingName: "Digital Commercial Bank Ltd"
    };

    const response = await sendTransferToMG(params);

    // PASO 5: Si la respuesta es exitosa (200 OK), marcar como enviada
    // await settlementService.updateStatus(settlementId, 'SENT', {
    //   mgTransactionId: response.transactionId,
    //   sentAt: new Date().toISOString()
    // });

    // PASO 6: Registrar en audit log
    // await auditLogService.log({
    //   action: 'MG_TRANSFER_SENT',
    //   settlementId: settlementId,
    //   transferRequestId: transferRequestId,
    //   amount: amount,
    //   currency: currency
    // });

    console.log('✅ Transferencia enviada y registrada:', {
      settlementId,
      transferRequestId,
      response
    });

    return {
      success: true,
      transferRequestId,
      response
    };
  } catch (error) {
    // En caso de error, revertir el débito del ledger
    // await ledgerService.credit({
    //   accountId: accountId,
    //   amount: amount,
    //   currency: currency,
    //   reference: `MG-Transfer-Rollback-${settlementId}`
    // });

    // Marcar como fallida
    // await settlementService.updateStatus(settlementId, 'FAILED', {
    //   error: error instanceof Error ? error.message : String(error)
    // });

    console.error('❌ Error en transferencia MG:', error);
    throw error;
  }
}

// ============================================================================
// Ejemplo 4: Manejo de Errores Avanzado
// ============================================================================

/**
 * Ejemplo de manejo de errores con reintentos y logging detallado
 */
export async function ejemploConManejoErrores(
  params: MgTransferParams,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Intento ${attempt}/${maxRetries}] Enviando transferencia...`);
      
      const response = await sendTransferToMG(params);
      
      console.log(`✅ Transferencia exitosa en intento ${attempt}`);
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`❌ Intento ${attempt} fallido:`, lastError.message);
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        console.error('❌ Todos los intentos fallaron');
        throw lastError;
      }
      
      // Esperar antes del siguiente intento (exponential backoff)
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Error desconocido');
}

// ============================================================================
// Ejemplo 5: Batch de Transferencias
// ============================================================================

/**
 * Ejemplo de envío de múltiples transferencias
 * 
 * NOTA: En producción, considera usar una cola de mensajes
 * para procesar transferencias en batch de forma asíncrona.
 */
export async function ejemploBatchTransferencias(
  transfers: Array<{
    amount: string;
    currency: string;
    account: string;
    reference: string;
  }>
) {
  const results = [];
  const errors = [];

  for (const transfer of transfers) {
    try {
      const params: MgTransferParams = {
        transferRequestId: `BATCH-${transfer.reference}-${Date.now()}`,
        amount: transfer.amount,
        receivingCurrency: transfer.currency,
        receivingAccount: transfer.account,
        sendingName: "Digital Commercial Bank Ltd"
      };

      const response = await sendTransferToMG(params);
      results.push({
        reference: transfer.reference,
        success: true,
        response
      });

      // Pequeña pausa entre transferencias para no saturar el servidor
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      errors.push({
        reference: transfer.reference,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    total: transfers.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors
  };
}

// ============================================================================
// Exportaciones
// ============================================================================

export default {
  ejemploTransferenciaBasica,
  ejemploConDateTimePersonalizado,
  ejemploIntegracionLiquidacion,
  ejemploConManejoErrores,
  ejemploBatchTransferencias
};

