/**
 * The Kingdom Bank - Signature Module
 * HMAC-SHA256 + Base64 signing for TKB API
 * Compatible con navegador usando Web Crypto API
 */

/**
 * Firma el payload usando HMAC-SHA256 + Base64, según doc de The Kingdom Bank.
 * 
 * @param bodyJson - JSON string EXACTO que se va a enviar como body
 * @param signatureKey - Signature Key (secreta) del merchant
 * @returns signature - firma en Base64
 */
export async function signPayload(bodyJson: string, signatureKey: string): Promise<string> {
  // Usar Web Crypto API para navegador
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signatureKey);
  const messageData = encoder.encode(bodyJson);

  // Importar clave para HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Firmar
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convertir a Base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Valida la firma de un webhook
 */
export async function validateSignature(
  rawBody: string,
  receivedSignature: string,
  signatureKey: string
): Promise<boolean> {
  const localSignature = await signPayload(rawBody, signatureKey);
  
  // Comparación timing-safe
  if (localSignature.length !== receivedSignature.length) return false;
  
  let result = 0;
  for (let i = 0; i < localSignature.length; i++) {
    result |= localSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

