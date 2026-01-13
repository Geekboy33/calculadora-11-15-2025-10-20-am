import type { HttpMethod, Logger, SecurityType, YexResult } from "../types.js";
import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}




import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}



import { toQuery } from "../utils/qs.js";
import { MinuteRateLimiter } from "../http/rateLimiter.js";
import { HttpClient } from "../http/httpClient.js";
import { YexSigner } from "./yexSigner.js";

export interface YexRestClientOptions {
  restBase: string;
  futuresBase: string;

  recvWindowMs: number;        // default 5000
  timeoutMs: number;
  maxRetries: number;

  // peso local. Puedes subir/bajar. YEX global: 12k/min IP, 60k/min UID.
  localReqPerMinute: number;

  apiKey: string;
  apiSecret: string;

  logger: Logger;
}

export class YexRestClient {
  private signer: YexSigner;
  private http: HttpClient;
  private limiter: MinuteRateLimiter;
  private logger: Logger;

  constructor(private opts: YexRestClientOptions) {
    this.signer = new YexSigner(opts.apiKey, opts.apiSecret);
    this.http = new HttpClient({ 
      timeoutMs: opts.timeoutMs, 
      maxRetries: opts.maxRetries, 
      logger: opts.logger 
    });
    this.limiter = new MinuteRateLimiter(opts.localReqPerMinute);
    this.logger = opts.logger;
  }

  /**
   * Determina el base URL según el path
   * - /fapi/* -> futuresBase
   * - otros -> restBase
   */
  private baseFor(path: string): string {
    if (path.startsWith("/fapi/")) {
      return this.opts.futuresBase;
    }
    return this.opts.restBase;
  }

  /**
   * Realiza una llamada a la API YEX
   * @param method HTTP method
   * @param path API path (e.g., /sapi/v1/order)
   * @param security Tipo de seguridad requerido
   * @param query Query parameters
   * @param body Request body
   * @returns YexResult con la respuesta o error
   */
  async call<T>(
    method: HttpMethod,
    path: string,
    security: SecurityType,
    query?: Record<string, any>,
    body?: any
  ): Promise<YexResult<T>> {
    // Rate limiting local
    this.limiter.take(1);

    // Construir URL
    const queryParams = query ? { ...query } : {};
    
    // Agregar recvWindow si es endpoint firmado
    if (security !== "NONE" && security !== "MARKET_DATA") {
      if (queryParams.recvWindow === undefined) {
        queryParams.recvWindow = this.opts.recvWindowMs;
      }
    }

    const q = Object.keys(queryParams).length > 0 ? toQuery(queryParams) : "";
    const url = `${this.baseFor(path)}${path}${q}`;

    // Preparar headers
    const headers: Record<string, string> = {};

    if (security === "NONE" || security === "MARKET_DATA") {
      // Endpoints públicos - sin autenticación
      // Algunos exchanges requieren API key para market data; 
      // descomenta si YEX lo requiere:
      // Object.assign(headers, this.signer.makeApiKeyHeaders());
    } else {
      // Endpoints privados - requieren firma
      Object.assign(headers, this.signer.makeHeaders(method, path, body));
    }

    this.logger.debug("YEX API call", { method, path, security, hasBody: !!body });

    return this.http.request<T>(url, method, headers, body);
  }

  /**
   * Obtiene el rate limiter para inspección
   */
  getRateLimiter(): MinuteRateLimiter {
    return this.limiter;
  }

  /**
   * Obtiene el signer para uso avanzado
   */
  getSigner(): YexSigner {
    return this.signer;
  }
}





