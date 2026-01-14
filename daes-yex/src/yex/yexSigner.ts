import type { HttpMethod } from "../types.js";
import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}




import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}



import { hmacSha256Hex } from "../utils/crypto.js";
import { nowMs } from "../utils/time.js";

/**
 * Firma YEX (X-CH-SIGN):
 * prehash = timestamp + method + requestPath + bodyString
 * signature = HMAC_SHA256_HEX(secret, prehash)
 * 
 * Headers requeridos para endpoints firmados:
 * - X-CH-APIKEY: API Key
 * - X-CH-TS: Timestamp en milisegundos
 * - X-CH-SIGN: Firma HMAC-SHA256
 */
export class YexSigner {
  constructor(
    private apiKey: string, 
    private apiSecret: string
  ) {}

  /**
   * Genera headers firmados para una solicitud
   * @param method HTTP method (GET, POST, etc.)
   * @param requestPath Path de la solicitud (e.g., /sapi/v1/order)
   * @param body Body de la solicitud (opcional)
   * @returns Headers con firma
   */
  makeHeaders(
    method: HttpMethod, 
    requestPath: string, 
    body?: any
  ): Record<string, string> {
    const ts = String(nowMs());
    const bodyString = body === undefined ? "" : JSON.stringify(body);
    const prehash = `${ts}${method}${requestPath}${bodyString}`;
    const sign = hmacSha256Hex(this.apiSecret, prehash);

    return {
      "X-CH-APIKEY": this.apiKey,
      "X-CH-TS": ts,
      "X-CH-SIGN": sign,
    };
  }

  /**
   * Genera headers solo con API Key (sin firma)
   * Para endpoints que requieren autenticación pero no firma
   */
  makeApiKeyHeaders(): Record<string, string> {
    return { 
      "X-CH-APIKEY": this.apiKey 
    };
  }

  /**
   * Genera firma para un payload específico
   * @param payload String a firmar
   * @returns Firma HMAC-SHA256 en hexadecimal
   */
  sign(payload: string): string {
    return hmacSha256Hex(this.apiSecret, payload);
  }

  /**
   * Verifica si una firma es válida
   * @param payload Payload original
   * @param signature Firma a verificar
   * @returns true si la firma es válida
   */
  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}






